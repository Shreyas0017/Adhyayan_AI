const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
const Groq = require("groq-sdk");
const { OpenAI } = require("openai"); // Add OpenAI import
const multer = require("multer");
const pdfParse = require("pdf-parse");
const tesseract = require("tesseract.js");
const sharp = require("sharp");
const mammoth = require("mammoth");
const path = require("path");
const fs = require("fs").promises;
const fetch = require("node-fetch"); // For keep-alive pings
const { fixBrokenJSON } = require("./fix_json"); // Import the JSON fixing utility
const { transformGroqResponse } = require("./transform"); // Import the transform utility
const ElevenLabsService = require("./elevenlabs-service"); // Import the ElevenLabs service
const { tavily } = require("@tavily/core");
const { getJson } = require("serpapi");
const { google } = require("googleapis");
require("dotenv").config();

// Ensure JWT_SECRET exists or use a fallback for development
if (!process.env.JWT_SECRET) {
  console.warn(
    "JWT_SECRET not found in environment variables. Using fallback secret for development only."
  );
  process.env.JWT_SECRET = "adhyayan_ai_development_secret";
} else {
  console.log("Using JWT_SECRET from environment variables");
}

const app = express();
// Production - restrict to your frontend domain
const corsOptions = {
  origin: process.env.FRONTEND_URL || "https://adhyayan-ai.vercel.app",
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from public directory (for podcasts)
app.use(
  "/podcasts",
  express.static(path.join(__dirname, "public", "podcasts"))
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    details: err.message,
  });
});

// Initialize Groq (keeping for backward compatibility)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Initialize OpenAI for mind map generation with proper timeouts
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2,
  httpAgent: {
    keepAlive: true,
  },
});

// Initialize OpenAI for document parsing with dedicated API key and proper timeouts
const parsingOpenAI = new OpenAI({
  apiKey: process.env.PARSING_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  maxRetries: 2,
  httpAgent: {
    keepAlive: true,
  },
});

// Initialize Parsing AI Agent with dedicated API key from environment (keeping for backward compatibility)
const parsingGroq = new Groq({
  apiKey: process.env.PARSING_GROQ_API_KEY,
});

// Initialize ElevenLabs service for podcast generation
const elevenLabsService = new ElevenLabsService(
  process.env.ELEVENLABS_API_KEY,
  process.env.GEMINI_API_KEY
);

// Initialize Tavily Search API
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

// Initialize YouTube API
const youtube = google.youtube("v3");

// Helper function to search for images using SerpAPI
const searchImages = async (query) => {
  try {
    const response = await getJson({
      engine: "google_images",
      q: `${query} tutorial diagram explanation educational`,
      api_key: process.env.SERPAPI_API_KEY,
      num: 5,
    });

    return (
      response.images_results?.slice(0, 5).map((img) => ({
        url: img.original,
        title: img.title,
        source: img.source,
        thumbnail: img.thumbnail,
      })) || []
    );
  } catch (error) {
    console.error("Image search error:", error);
    return [];
  }
};

// Helper function to search for educational videos
const searchEducationalVideos = async (topic) => {
  try {
    const response = await youtube.search.list({
      key: process.env.YOUTUBE_API_KEY,
      part: "snippet",
      q: `${topic} tutorial explanation educational`,
      type: "video",
      videoDuration: "medium", // 4-20 minutes
      maxResults: 3,
      relevanceLanguage: "en",
      safeSearch: "strict",
    });

    return (
      response.data.items?.map((video) => ({
        videoId: video.id.videoId,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail: video.snippet.thumbnails.medium.url,
        embedUrl: `https://www.youtube.com/embed/${video.id.videoId}`,
        channelTitle: video.snippet.channelTitle,
        publishedAt: video.snippet.publishedAt,
      })) || []
    );
  } catch (error) {
    console.error("YouTube search error:", error);
    return [];
  }
};

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "text/markdown",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, DOC, DOCX, TXT, MD, and image files are allowed."
        )
      );
    }
  },
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  console.log("Verifying token...");
  console.log("Auth header:", req.headers.authorization);

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    console.log("Authentication error: No token provided");
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables");
      console.log("JWT_SECRET value:", process.env.JWT_SECRET);
      return res.status(500).json({ error: "Server configuration error" });
    }

    console.log(
      "Verifying with secret:",
      process.env.JWT_SECRET.substring(0, 3) + "..."
    );
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token decoded successfully:", decoded);
      req.user = decoded;
      next();
    } catch (jwtError) {
      console.log("JWT verification error:", jwtError.message);
      console.log("Token attempted to verify:", token.substring(0, 10) + "...");
      return res
        .status(401)
        .json({ error: "Invalid token", details: jwtError.message });
    }
  } catch (error) {
    console.log("Authentication error:", error.message);
    return res
      .status(401)
      .json({ error: "Authentication error", details: error.message });
  }
};

// Initialize Firebase Admin
let firebaseInitialized = false;

// Helper function to parse and fix Firebase service account
const parseFirebaseServiceAccount = (serviceAccountString) => {
  try {
    const serviceAccount = JSON.parse(serviceAccountString);

    // Fix common issues with private key formatting
    if (serviceAccount.private_key) {
      // Replace escaped newlines with actual newlines
      serviceAccount.private_key = serviceAccount.private_key.replace(
        /\\n/g,
        "\n"
      );

      // Ensure the private key starts and ends correctly
      if (
        !serviceAccount.private_key.startsWith("-----BEGIN PRIVATE KEY-----")
      ) {
        throw new Error("Private key does not start with proper PEM header");
      }
      if (!serviceAccount.private_key.endsWith("-----END PRIVATE KEY-----\n")) {
        if (serviceAccount.private_key.endsWith("-----END PRIVATE KEY-----")) {
          serviceAccount.private_key += "\n";
        } else {
          throw new Error("Private key does not end with proper PEM footer");
        }
      }
    }

    return serviceAccount;
  } catch (error) {
    console.error("Error parsing Firebase service account:", error.message);
    throw error;
  }
};

try {
  console.log("Checking Firebase environment variables...");
  console.log(
    "FIREBASE_SERVICE_ACCOUNT exists:",
    !!process.env.FIREBASE_SERVICE_ACCOUNT
  );
  console.log(
    "GOOGLE_APPLICATION_CREDENTIALS exists:",
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log("Initializing Firebase Admin with service account");

    // Parse and fix service account
    const serviceAccount = parseFirebaseServiceAccount(
      process.env.FIREBASE_SERVICE_ACCOUNT
    );
    console.log("Service account parsed and formatted successfully");

    // Validate critical fields
    if (
      !serviceAccount.private_key ||
      !serviceAccount.client_email ||
      !serviceAccount.project_id
    ) {
      throw new Error(
        "Missing critical fields in service account: private_key, client_email, or project_id"
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase Admin initialized successfully");
    firebaseInitialized = true;
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      "Initializing Firebase Admin with application default credentials"
    );
    admin.initializeApp();
    console.log(
      "Firebase Admin initialized with application default credentials"
    );
    firebaseInitialized = true;
  } else {
    console.warn(
      "Firebase service account not provided. Authentication will be limited."
    );
    // For development, we'll skip Firebase Admin initialization
    // and use a mock authentication approach
  }
} catch (error) {
  console.error("Error initializing Firebase Admin:", error);

  // Log more details about the error
  if (error.code === "app/invalid-credential") {
    console.error("Invalid credential error - likely a malformed private key");
    console.error(
      "Make sure your FIREBASE_SERVICE_ACCOUNT environment variable contains valid JSON"
    );
    console.error(
      "And that the private_key field has proper newline formatting"
    );
  }

  console.error(
    "Firebase initialization failed. Authentication endpoints will not work."
  );
}

// MongoDB connection
let client;
let db;

const connectToMongoDB = async () => {
  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    db = client.db("adhyayanai");

    // Create indexes for improved query performance
    await db.collection("mindmaps").createIndex({ userId: 1 });
    await db.collection("mindmaps").createIndex({ title: "text" });
    await db.collection("users").createIndex({ uid: 1 }, { unique: true });

    console.log("MongoDB indexes created successfully");
  } catch (error) {
    console.error(
      "Error connecting to MongoDB (continuing without DB):",
      error.message
    );
  }
};

// Initialize MongoDB connection
connectToMongoDB();

// Helper function to check database connection
const checkDbConnection = (req, res, next) => {
  if (!db) {
    return res
      .status(500)
      .json({ error: "Database connection not established" });
  }
  next();
};

// AUTHENTICATION ENDPOINTS

// Google OAuth authentication endpoint (matches client expectation)
app.post("/api/auth/google", async (req, res) => {
  try {
    console.log("Processing Google authentication request");

    if (!firebaseInitialized) {
      console.error("Firebase Admin not initialized");
      return res.status(500).json({
        error: "Firebase authentication not available",
      });
    }

    const { idToken, user } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "ID token is required" });
    }

    console.log("Verifying Firebase token for user:", user?.uid || "unknown");

    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log("Firebase token verified:", decodedToken.uid);

    // Create a JWT token with user info
    const jwtPayload = {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      name: decodedToken.name || "",
      picture: decodedToken.picture || "",
    };

    // If MongoDB is connected, make sure the user exists in our database
    if (db) {
      const existingUser = await db
        .collection("users")
        .findOne({ uid: decodedToken.uid });

      if (!existingUser) {
        // Create new user record with 50 Gyan Points (free credits)
        const newUser = {
          uid: decodedToken.uid,
          email: decodedToken.email || "",
          displayName: decodedToken.name || "",
          photoURL: decodedToken.picture || "",
          createdAt: new Date(),
          lastLogin: new Date(),
          gyanPoints: 50, // Initial free Gyan Points
          settings: {
            theme: "light", // default settings
            notifications: true,
          },
        };

        await db.collection("users").insertOne(newUser);
        console.log(
          "New user created in database with 50 Gyan Points:",
          decodedToken.uid
        );
      } else {
        // Update last login time
        await db
          .collection("users")
          .updateOne(
            { uid: decodedToken.uid },
            { $set: { lastLogin: new Date() } }
          );
        console.log("User login time updated:", decodedToken.uid);
      }
    }

    // Sign the JWT
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
      expiresIn: "7d", // Token expires in 7 days
    });

    res.json({ token, user: jwtPayload });
  } catch (error) {
    console.error("Google authentication error:", error);
    res.status(401).json({ error: error.message });
  }
});

// Login with Firebase token and issue JWT (legacy endpoint)
app.post("/api/login", async (req, res) => {
  try {
    if (!firebaseInitialized) {
      console.error("Firebase Admin not initialized");
      return res.status(500).json({
        error: "Firebase authentication not available",
      });
    }

    const { firebaseToken } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({ error: "Firebase token is required" });
    }

    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    console.log("Firebase token verified:", decodedToken);

    // Create a JWT token with user info
    const jwtPayload = {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      name: decodedToken.name || "",
      picture: decodedToken.picture || "",
    };

    // If MongoDB is connected, make sure the user exists in our database
    if (db) {
      const existingUser = await db
        .collection("users")
        .findOne({ uid: decodedToken.uid });
      if (!existingUser) {
        // Create new user record with 50 Gyan Points (free credits)
        const newUser = {
          uid: decodedToken.uid,
          email: decodedToken.email || "",
          displayName: decodedToken.name || "",
          photoURL: decodedToken.picture || "",
          createdAt: new Date(),
          lastLogin: new Date(),
          gyanPoints: 50, // Initial free Gyan Points
          settings: {
            theme: "light", // default settings
            notifications: true,
          },
        };

        await db.collection("users").insertOne(newUser);
        console.log(
          "New user created in database with 50 Gyan Points:",
          decodedToken.uid
        );
      } else {
        // Update last login time
        await db
          .collection("users")
          .updateOne(
            { uid: decodedToken.uid },
            { $set: { lastLogin: new Date() } }
          );
        console.log("User login time updated:", decodedToken.uid);
      }
    }

    // Sign the JWT
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
      expiresIn: "7d", // Token expires in 7 days
    });

    res.json({ token, user: jwtPayload });
  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({ error: error.message });
  }
});

// Endpoint to get user profile
app.get("/api/user", verifyToken, checkDbConnection, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get user from database
    const user = await db.collection("users").findOne({ uid: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return user data without sensitive information
    res.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      settings: user.settings || {},
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      gyanPoints: user.gyanPoints || 0, // Include Gyan Points in the response
    });
  } catch (error) {
    console.error("Error retrieving user profile:", error);
    res.status(500).json({ error: "Failed to retrieve user profile" });
  }
});
// Endpoint to update user settings
app.patch(
  "/api/user/settings",
  verifyToken,
  checkDbConnection,
  async (req, res) => {
    try {
      const userId = req.user.uid;
      const { settings } = req.body;

      if (!settings) {
        return res.status(400).json({
          success: false,
          error: "Settings object is required",
        });
      }

      await db
        .collection("users")
        .updateOne({ uid: userId }, { $set: { settings } });

      res.json({
        success: true,
        message: "Settings updated successfully",
        settings,
      });
    } catch (error) {
      console.error("Error updating user settings:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to update user settings",
        details: error.message,
      });
    }
  }
);

// Endpoint to get user's Gyan Points
app.get(
  "/api/user/gyan-points",
  verifyToken,
  checkDbConnection,
  async (req, res) => {
    try {
      const userId = req.user.uid;

      // Get user from database
      const user = await db
        .collection("users")
        .findOne({ uid: userId }, { projection: { gyanPoints: 1 } });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Return only the Gyan Points
      res.json({
        gyanPoints: user.gyanPoints || 0,
      });
    } catch (error) {
      console.error("Error retrieving Gyan Points:", error);
      res.status(500).json({ error: "Failed to retrieve Gyan Points" });
    }
  }
);

// MIND MAP ENDPOINTS

// Endpoint to create a mind map
app.post(
  "/api/mindmap/create",
  verifyToken,
  checkDbConnection,
  async (req, res) => {
    try {
      const { subjectName, prompt = "", options = {} } = req.body;

      if (!subjectName) {
        return res.status(400).json({
          success: false,
          error: "Subject name is required",
        });
      }
      console.log("Generating mind map for subject:", subjectName);
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an elite educational mind map creator with PhD-level expertise in academic curriculum design. Your mission is to create comprehensive, university-level mind maps that capture the complete breadth and depth of any academic subject.

ADVANCED MIND MAP INTELLIGENCE:
1. COMPREHENSIVE SUBJECT ANALYSIS: Understand the full scope of the subject, including core concepts, advanced topics, applications, and interconnections
2. INFINITE DEPTH CAPABILITY: Create hierarchical structures with unlimited nesting levels (subtopics → sub_subtopics → sub_sub_subtopics → etc.)
3. ACADEMIC RIGOR: Ensure university-level depth with proper theoretical foundations, methodologies, and applications
4. COMPLETE COVERAGE: Include ALL major areas of the subject - theoretical, practical, historical, and contemporary aspects
5. INTELLIGENT ORGANIZATION: Structure topics in logical learning progression with clear conceptual relationships
6. CROSS-DISCIPLINARY CONNECTIONS: Identify relationships with other fields and interdisciplinary applications

MIND MAP STRUCTURE REQUIREMENTS:
- Central node: Subject name with comprehensive academic overview
- Module nodes: 6-12 major topic areas covering the complete subject
- Subtopics: 4-8 subtopics per major topic with detailed content
- Deeper nesting: Add sub_subtopics, sub_sub_subtopics as needed for complex subjects
- Rich descriptions: Educational content for each node explaining key concepts
- Progressive complexity: Arrange topics to build knowledge systematically

PERFECT JSON OUTPUT FORMAT:
{
  "mind_map": {
    "central_node": {
      "title": "Subject Name",
      "description": "Comprehensive academic overview covering scope and significance",
      "content": "Detailed description including key areas, methodologies, and applications"
    },
    "module_nodes": [
      {
        "title": "Major Topic Area 1",
        "content": "Comprehensive description of this topic area with key concepts",
        "subtopics": [
          {
            "title": "Important Subtopic",
            "content": "Detailed explanation of concepts and applications",
            "sub_subtopics": [
              {
                "title": "Specific Concept",
                "content": "Detailed technical description",
                "sub_sub_subtopics": []
              }
            ]
          }
        ]
      }
    ]
  }
}

CRITICAL SUCCESS CRITERIA:
- Cover 100% of the subject's academic scope
- Include theoretical foundations, methodologies, and applications
- Create logical learning progression
- Provide rich, educational content descriptions
- Use proper academic terminology
- Structure for university-level learning
- Generate unlimited depth as needed for complex topics
- Ensure JSON is perfectly valid with no syntax errors
- Output only pure JSON with no markdown formatting or explanations
- Always include proper nesting for all hierarchical relationships
- Ensure no trailing commas or invalid characters in the JSON

Create the most comprehensive academic mind map possible for the subject.`,
          },
          {
            role: "user",
            content: `Create a comprehensive, university-level mind map for: "${subjectName}"
${prompt ? ` Additional requirements: ${prompt}` : ""}

Generate a complete academic mind map covering all major areas, theories, methods, and applications of this subject.`,
          },
        ],
        model: "gpt-3.5-turbo",
        temperature: 0.2,
        max_tokens: 3000,
        top_p: 0.9,
        response_format: { type: "json_object" },
      });
      console.log("OpenAI response received");
      let jsonResponseContent;
      try {
        const content = completion.choices[0]?.message?.content || "";
        console.log("Raw response length:", content.length);

        try {
          // Direct parsing since OpenAI with response_format: { type: "json_object" } returns valid JSON
          jsonResponseContent = JSON.parse(content);
          console.log("JSON parsed successfully on first attempt");
        } catch (parseError) {
          console.log(
            "First parse attempt failed, checking for JSON code blocks"
          );

          // Try to extract JSON from code blocks if present (fallback)
          const jsonBlockMatch = content.match(/```json\n([\s\S]*?)\n```/);
          if (jsonBlockMatch && jsonBlockMatch[1]) {
            const jsonText = jsonBlockMatch[1];
            try {
              jsonResponseContent = JSON.parse(jsonText);
              console.log("JSON parsed from code block");
            } catch (innerError) {
              console.log(
                "JSON parsing from code block failed, trying to fix JSON"
              );
              const fixedJson = fixBrokenJSON(jsonText);
              jsonResponseContent = JSON.parse(fixedJson);
              console.log("Fixed JSON parsed successfully");
            }
          } else {
            console.log(
              "No JSON code blocks found, trying to fix entire content"
            );
            const fixedJson = fixBrokenJSON(content);
            jsonResponseContent = JSON.parse(fixedJson);
            console.log("Fixed JSON parsed successfully");
          }
        }
      } catch (error) {
        console.error("JSON parsing failed:", error.message);
        return res.status(500).json({
          success: false,
          error: "Failed to parse mind map data",
          details: error.message,
        });
      }

      const transformedData = transformGroqResponse(
        jsonResponseContent,
        subjectName
      );
      const userId = req.user.uid;

      let result;
      if (db) {
        result = await db.collection("mindmaps").insertOne({
          userId: userId,
          title: subjectName,
          data: transformedData,
          createdAt: new Date(),
          lastModified: new Date(),
          prompt: prompt || "",
          options: options || {},
        });
        console.log(`Mind map saved to database with ID: ${result.insertedId}`);
      }

      res.status(201).json({
        success: true,
        message: "Mind map created successfully",
        mindMapId: result?.insertedId || null,
        data: transformedData,
      });
    } catch (error) {
      console.error("Error creating mind map:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to create mind map",
        details: error.message,
      });
    }
  }
);

// Endpoint to get a mind map by ID
app.get(
  "/api/mindmap/:id",
  verifyToken,
  checkDbConnection,
  async (req, res) => {
    try {
      const mindMapId = req.params.id;

      if (!ObjectId.isValid(mindMapId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid mind map ID format",
        });
      }

      const mindMap = await db.collection("mindmaps").findOne({
        _id: new ObjectId(mindMapId),
      });

      if (!mindMap) {
        return res.status(404).json({
          success: false,
          error: "Mind map not found",
        });
      }

      const userId = req.user.uid;
      if (mindMap.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      res.json({
        success: true,
        mindMap: {
          id: mindMap._id,
          title: mindMap.title,
          data: mindMap.data,
          createdAt: mindMap.createdAt,
          lastModified: mindMap.lastModified,
        },
      });
    } catch (error) {
      console.error("Error retrieving mind map:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve mind map",
        details: error.message,
      });
    }
  }
);

// Endpoint to get all mind maps for a user
app.get(
  "/api/mindmap/list",
  verifyToken,
  checkDbConnection,
  async (req, res) => {
    try {
      const userId = req.user.uid;

      const mindMaps = await db
        .collection("mindmaps")
        .find({ userId })
        .sort({ lastModified: -1 })
        .project({
          title: 1,
          createdAt: 1,
          lastModified: 1,
        })
        .toArray();

      res.json({
        success: true,
        mindMaps: mindMaps.map((map) => ({
          id: map._id,
          title: map.title,
          createdAt: map.createdAt,
          lastModified: map.lastModified,
        })),
      });
    } catch (error) {
      console.error("Error retrieving mind maps:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve mind maps",
        details: error.message,
      });
    }
  }
);

// Endpoint to delete a mind map
app.delete(
  "/api/mindmap/:id",
  verifyToken,
  checkDbConnection,
  async (req, res) => {
    try {
      const mindMapId = req.params.id;

      if (!ObjectId.isValid(mindMapId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid mind map ID format",
        });
      }

      const mindMap = await db.collection("mindmaps").findOne({
        _id: new ObjectId(mindMapId),
      });

      if (!mindMap) {
        return res.status(404).json({
          success: false,
          error: "Mind map not found",
        });
      }

      const userId = req.user.uid;
      if (mindMap.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      await db.collection("mindmaps").deleteOne({
        _id: new ObjectId(mindMapId),
      });

      res.json({
        success: true,
        message: "Mind map deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting mind map:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to delete mind map",
        details: error.message,
      });
    }
  }
);

// Endpoint to parse a document and create a mind map
app.post(
  "/api/mindmap/parse-document",
  verifyToken,
  upload.single("document"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No document uploaded",
        });
      }

      const { subjectName } = req.body;
      if (!subjectName) {
        return res.status(400).json({
          success: false,
          error: "Subject name is required",
        });
      }

      console.log("Parsing document of type:", req.file.mimetype);
      let documentText = "";

      if (req.file.mimetype === "application/pdf") {
        const pdfData = await pdfParse(req.file.buffer);
        documentText = pdfData.text;
      } else if (req.file.mimetype.includes("word")) {
        const result = await mammoth.extractRawText({
          buffer: req.file.buffer,
        });
        documentText = result.value;
      } else if (req.file.mimetype.includes("image")) {
        const img = await sharp(req.file.buffer).toBuffer();
        const { data } = await tesseract.recognize(img, "eng");
        documentText = data.text;
      } else {
        documentText = req.file.buffer.toString("utf8");
      }

      if (!documentText || documentText.length < 50) {
        return res.status(400).json({
          success: false,
          error: "Could not extract sufficient text from the document",
        });
      }
      console.log(`Extracted ${documentText.length} characters of text`);
      const maxLength = 15000;
      const trimmedText =
        documentText.length > maxLength
          ? documentText.slice(0, maxLength) +
            "... [Text truncated due to length]"
          : documentText;

      const completion = await parsingOpenAI.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an elite educational document analysis specialist with unprecedented expertise in extracting comprehensive learning structures from any academic content. Your mission is to analyze documents and create detailed mind maps that capture every educational concept and relationship with perfect hierarchical organization.

ENHANCED DOCUMENT ANALYSIS CAPABILITIES:
1. INTELLIGENT STRUCTURE DETECTION: Automatically recognize document structure regardless of format (headers, sections, paragraphs, bullet points)
2. COMPLETE CONTENT EXTRACTION: Identify ALL educational concepts, theories, methods, details, and relationships from the document
3. PERFECT HIERARCHICAL MAPPING: Create proper nested relationships from main topics down to the most granular concepts
4. UNLIMITED NESTING DEPTH: Extract content to unlimited depth levels (subtopics → sub_subtopics → sub_sub_subtopics →...)
5. SEMANTIC CLUSTERING: Group related concepts even when not explicitly connected in the document
6. CONTEXTUAL UNDERSTANDING: Preserve the original meaning and educational intent of all content

DOCUMENT PROCESSING REQUIREMENTS:
- Extract ALL main topics from document sections/chapters
- Identify EVERY subtopic within each main topic
- Create sub_subtopics for ALL detailed concepts
- Continue nesting deeper as content complexity requires
- Use precise content from document for descriptions (not general knowledge)
- Preserve educational progression and learning path
- Handle ANY document layout or formatting style
- Output PERFECTLY valid JSON with proper nesting structure

PERFECT JSON OUTPUT FORMAT:
{
  "mind_map": {
    "central_node": {
      "title": "Subject Name",
      "description": "Comprehensive overview extracted from document",
      "content": "Detailed description covering key concepts from document content"
    },
    "module_nodes": [
      {
        "title": "Main Topic from Document",
        "content": "Rich description extracted from document text",
        "subtopics": [
          {
            "title": "Subtopic from Document",
            "content": "Detailed content from document",
            "sub_subtopics": [
              {
                "title": "Specific Concept",
                "content": "Detailed explanation from document",
                "sub_sub_subtopics": []
              }
            ]
          }
        ]
      }
    ]
  }
}

CRITICAL SUCCESS CRITERIA:
- Extract 100% of educational content from document
- Create perfect hierarchical learning structure with correct nesting
- Use actual document content in descriptions, not general knowledge
- Ensure ALL content is organized into proper parent-child relationships
- Handle ANY document layout or formatting consistently
- Ensure EVERY concept is properly placed in the hierarchy
- Output PERFECTLY valid JSON with no syntax errors
- Output ONLY pure JSON with no markdown formatting or explanations
- NEVER use trailing commas or invalid characters in JSON

Transform the complete document into a comprehensive learning mind map with perfect hierarchical organization.`,
          },
          {
            role: "user",
            content: `Analyze this complete document and create a comprehensive mind map for "${subjectName}" extracting ALL educational content:

${trimmedText}`,
          },
        ],
        model: "gpt-3.5-turbo",
        temperature: 0.1, // Lower temperature for more deterministic parsing
        max_tokens: 3000,
        top_p: 0.9,
        response_format: { type: "json_object" },
      });
      console.log("OpenAI parsing response received");
      let jsonResponseContent;
      try {
        const content = completion.choices[0]?.message?.content || "";
        console.log("Raw response length:", content.length);

        try {
          // Direct parsing since OpenAI with response_format: { type: "json_object" } returns valid JSON
          jsonResponseContent = JSON.parse(content);
          console.log("JSON parsed successfully on first attempt");
        } catch (parseError) {
          console.log(
            "First parse attempt failed, checking for JSON code blocks"
          );

          // Try to extract JSON from code blocks if present (fallback)
          const jsonBlockMatch = content.match(/```json\n([\s\S]*?)\n```/);
          if (jsonBlockMatch && jsonBlockMatch[1]) {
            const jsonText = jsonBlockMatch[1];
            try {
              jsonResponseContent = JSON.parse(jsonText);
              console.log("JSON parsed from code block");
            } catch (innerError) {
              console.log(
                "JSON parsing from code block failed, trying to fix JSON"
              );
              const fixedJson = fixBrokenJSON(jsonText);
              jsonResponseContent = JSON.parse(fixedJson);
              console.log("Fixed JSON parsed successfully");
            }
          } else {
            console.log(
              "No JSON code blocks found, trying to fix entire content"
            );
            const fixedJson = fixBrokenJSON(content);
            jsonResponseContent = JSON.parse(fixedJson);
            console.log("Fixed JSON parsed successfully");
          }
        }
      } catch (error) {
        console.error("JSON parsing failed:", error.message);
        return res.status(500).json({
          success: false,
          error: "Failed to parse document content",
          details: error.message,
        });
      }

      const transformedData = transformGroqResponse(
        jsonResponseContent,
        subjectName
      );
      const userId = req.user.uid;

      let mindMapId = null;
      if (db) {
        const result = await db.collection("mindmaps").insertOne({
          userId: userId,
          title: subjectName,
          sourceType: "document",
          sourceFileName: req.file.originalname,
          data: transformedData,
          createdAt: new Date(),
          lastModified: new Date(),
        });
        mindMapId = result.insertedId;
        console.log(
          `Document-based mind map saved to database with ID: ${mindMapId}`
        );
      }

      res.status(201).json({
        success: true,
        message: "Document parsed and mind map created successfully",
        mindMapId: mindMapId,
        data: transformedData,
      });
    } catch (error) {
      console.error("Error parsing document:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to parse document",
        details: error.message,
      });
    }
  }
);

// Mind Map Generation Endpoint
app.post(
  "/api/mindmap/generate",
  verifyToken,
  checkDbConnection,
  async (req, res) => {
    try {
      const { subjectName, syllabus } = req.body;
      const userId = req.user.uid;

      // Constants for Gyan Points system
      const POINTS_REQUIRED = 15; // Points required for mind map generation

      if (!subjectName) {
        return res.status(400).json({
          success: false,
          error: "Subject name is required",
        });
      }

      if (!syllabus) {
        return res.status(400).json({
          success: false,
          error: "Syllabus content is required",
        });
      }

      // Check if user has enough Gyan Points
      const user = await db.collection("users").findOne({ uid: userId });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Initialize gyanPoints if not present
      const currentPoints = user.gyanPoints || 0;

      if (currentPoints < POINTS_REQUIRED) {
        return res.status(403).json({
          success: false,
          error: "Insufficient Gyan Points",
          currentPoints: currentPoints,
          requiredPoints: POINTS_REQUIRED,
        });
      }

      // Deduct points before generating the mind map
      await db
        .collection("users")
        .updateOne({ uid: userId }, { $inc: { gyanPoints: -POINTS_REQUIRED } });

      console.log(`Generating mind map for subject: ${subjectName}`);
      console.log(`Syllabus length: ${syllabus.length} characters`);
      console.log(
        `Deducted ${POINTS_REQUIRED} Gyan Points from user: ${userId}`
      );
      let parsingCompletion;
      try {
        parsingCompletion = await parsingOpenAI.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are a syllabus parsing AI that extracts educational content and creates structured JSON. Your task is to analyze the syllabus, identify topics and subtopics, and output valid JSON with the following objectives:

1. Extract main topics and subtopics from the syllabus
2. Organize content into a clear hierarchy
3. Clean up titles (remove clutter like "Unit-1", hours, codes)
4. Create brief educational descriptions
5. Output ONLY valid JSON

---

### JSON OUTPUT STRUCTURE
{
  "parsed_structure": {
    "main_subject": {
      "title": "Complete Subject Name",
      "description": "Comprehensive overview of the subject, including scope, objectives, and key areas"
    },
    "units": [
      {
        "title": "Clean Main Topic Title",
        "description": "Educational description summarizing content and purpose",
        "subtopics": [
          {
            "title": "Subtopic Title",
            "description": "Detailed explanation of this subtopic",
            "sub_subtopics": [
              {
                "title": "Sub-Subtopic Title",
                "description": "In-depth explanation of this concept",
                "sub_sub_subtopics": []
              }
            ]
          }
        ]
      }
    ]
  }
}

---

### SYLLABUS PROCESSING RULES
1. **Identify Main Subject**: Extract the subject name from the syllabus title or course code (e.g., "Introduction to Artificial Intelligence" from "CSE11112 Introduction to Artificial Intelligence").
2. **Detect Structure**:
   - **Unit-Based**: Extract "Unit-I", "Unit-II", etc., as main topics.
   - **Module-Based**: Identify "Module 1", "Module 2", etc.
   - **Chapter-Based**: Recognize "Chapter 1", "Chapter 2", etc.
   - **Topic-Based**: Group listed topics into logical units if no explicit units/modules.
   - **Mixed Formats**: Combine units, modules, and topics intelligently, preserving hierarchy.
3. **Extract Hierarchy**:
   - Main topics → \`units\` array.
   - Subtopics → \`subtopics\` array within each unit.
   - Sub-subtopics → \`sub_subtopics\` array, and continue nesting infinitely.
4. **Clean Titles**:
   - Remove prefixes (e.g., "Unit-I" → "Introduction", "Module 1:" → "Search Strategies").
   - Strip hours, codes, or administrative text (e.g., "10 Lecture Hours").
5. **Generate Descriptions**:
   - Use syllabus content for descriptions.
   - Enhance with educational context (e.g., why the topic matters, its applications).
   - Keep descriptions concise (50–100 words).
6. **Handle Edge Cases**:
   - Unstructured syllabi: Group related topics logically.
   - Missing details: Infer context from course objectives or description.
   - Long lists: Break into subtopics for readability.

---

### JSON VALIDATION RULES
1. **Iterative Validation**: During generation:
   - Track open \`{\` and \`[\` brackets.
   - Ensure each has a matching \`}\` or \`]\` before proceeding.
   - Count brackets after each unit to confirm balance.
2. **Final Validation**: Before outputting:
   - Parse the JSON string using a JSON parser (or simulate parsing).
   - If parsing fails, rebalance brackets and retry.
3. **Syntax Rules**:
   - All keys/values MUST be double-quoted (e.g., \`"title": "Value"\`).
   - Commas required between array items/properties, EXCEPT after the last item.
   - Escape quotes in strings (e.g., \`"Text with \\"quotes\\""\`).
   - No trailing commas.
   - No unquoted keys or values (except numbers, \`true\`, \`false\`, \`null\`).

---

### EXAMPLE INPUT 1: UNIT-BASED SYLLABUS (Introduction to Artificial Intelligence)
**Input Syllabus:**
\`\`\`
CSE11112 Introduction to Artificial Intelligence L T P C
Version 1.0 Contact Hours 45 3 0 0 3
Course Description:
Artificial intelligence (AI) is a research field that studies how to realize the intelligent human behaviors on a computer...
Course Content:
Unit-I 10 Lecture Hours
Introduction: Introduction, Agents, Problem formulation, Forward and backward chaining, Unification, Resolution.
Unit-II 8 Lecture Hours
Search in State Space and Planning: Uninformed search strategies, Heuristics, Informed search strategies...
Unit-III 9 Lecture Hours
Knowledge Representation & Reasoning: Introduction & Overview, Logical agents, Propositional logic...
Unit-IV 9 Lecture Hours
Uncertainty: Quantifying Uncertainty, Probabilistic Reasoning, Probabilistic Reasoning over Time...
Unit-V 9 Lecture Hours
Various wings of AI: Introduction to various wings of AI Neurophysiology, cognitive science, pattern recognition...
\`\`\`

**Expected Output:**
\`\`\`json
{
  "parsed_structure": {
    "main_subject": {
      "title": "Introduction to Artificial Intelligence",
      "description": "Foundational study of AI, focusing on creating systems that learn, plan, and solve problems autonomously, covering problem solving, reasoning, planning, and machine learning"
    },
    "units": [
      {
        "title": "Introduction",
        "description": "Overview of AI concepts, including intelligent agents, problem formulation, and logical inference techniques",
        "subtopics": [
          {
            "title": "Intelligent Agents",
            "description": "Systems that perceive and act rationally in their environment",
            "sub_subtopics": []
          },
          {
            "title": "Problem Formulation",
            "description": "Defining problems for AI systems to solve",
            "sub_subtopics": []
          },
          {
            "title": "Logical Inference",
            "description": "Techniques like forward/backward chaining, unification, and resolution",
            "sub_subtopics": [
              {
                "title": "Forward and Backward Chaining",
                "description": "Methods for deriving conclusions from rules",
                "sub_sub_subtopics": []
              },
              {
                "title": "Resolution",
                "description": "Proof technique for logical statements",
                "sub_sub_subtopics": []
              }
            ]
          }
        ]
      },
      {
        "title": "Search and Planning",
        "description": "Strategies for state-space search and planning in AI systems",
        "subtopics": [
          {
            "title": "Search Strategies",
            "description": "Uninformed and informed search methods for problem solving",
            "sub_subtopics": [
              {
                "title": "Uninformed Search",
                "description": "Breadth-first, depth-first, and other blind search techniques",
                "sub_sub_subtopics": []
              },
              {
                "title": "Informed Search",
                "description": "Heuristic-based methods like A* search",
                "sub_sub_subtopics": []
              }
            ]
          },
          {
            "title": "Planning",
            "description": "State-space planning, partial-order planning, and real-world applications",
            "sub_subtopics": []
          }
        ]
      },
      {
        "title": "Knowledge Representation and Reasoning",
        "description": "Methods for representing and reasoning with knowledge in AI",
        "subtopics": [
          {
            "title": "Logical Agents",
            "description": "Agents that use logic to make decisions",
            "sub_subtopics": []
          },
          {
            "title": "Propositional Logic",
            "description": "Basic logic for representing knowledge",
            "sub_subtopics": []
          }
        ]
      }
    ]
  }
}
\`\`\`

---

### EXAMPLE INPUT 2: MIXED SYLLABUS (Data Structures)
**Input Syllabus:**
\`\`\`
CS101 Data Structures
Module 1: Introduction
- Overview of Data Structures
- Types: Linear vs Non-Linear
Chapter 2: Arrays
- Array Operations
- Multi-dimensional Arrays
Topic List:
- Stacks: LIFO, Operations
- Queues: FIFO, Circular Queues
\`\`\`

**Expected Output:**
\`\`\`json
{
  "parsed_structure": {
    "main_subject": {
      "title": "Data Structures",
      "description": "Study of fundamental data organization techniques for efficient computation"
    },
    "units": [
      {
        "title": "Introduction",
        "description": "Overview of data structures and their classifications",
        "subtopics": [
          {
            "title": "Overview",
            "description": "Introduction to data structures and their importance",
            "sub_subtopics": []
          },
          {
            "title": "Types",
            "description": "Linear vs non-linear data structures",
            "sub_subtopics": []
          }
        ]
      },
      {
        "title": "Arrays",
        "description": "Contiguous memory structures for data storage",
        "subtopics": [
          {
            "title": "Array Operations",
            "description": "Insertion, deletion, and traversal operations",
            "sub_subtopics": []
          }
        ]
      },
      {
        "title": "Stacks and Queues",
        "description": "Linear data structures with specific access patterns",
        "subtopics": [
          {
            "title": "Stacks",
            "description": "Last-In-First-Out (LIFO) data structure",
            "sub_subtopics": []
          }
        ]
      }
    ]
  }
}
\`\`\`

---

### CRITICAL SUCCESS CRITERIA
- Extract 100% of syllabus content, including all topics and subtopics.
- Create a logical, hierarchical structure with infinite nesting depth.
- Generate clean, learner-friendly titles and educational descriptions.
- Produce perfect JSON syntax with no errors.
- Handle any syllabus format (unit-based, module-based, topic-based, mixed).
- Validate JSON structure iteratively during generation and before output.

---

**OUTPUT INSTRUCTIONS**:
- Respond with valid JSON only, starting with \`{\` and ending with \`}\`.
- Do NOT include markdown, code blocks (\`\`\`json), or explanations.
- Ensure all content is extracted and hierarchically organized.
- If JSON parsing fails during validation, rebalance brackets and retry before outputting.`,
            },
            {
              role: "user",
              content: `TASK: Parse this syllabus into PERFECT JSON structure.
SUBJECT: "${subjectName}"
OUTPUT: Only valid JSON starting with { and ending with }
NO CODE BLOCKS, NO EXPLANATIONS, NO MARKDOWN

SYLLABUS:
${syllabus}

RESPOND WITH VALID JSON ONLY:`,
            },
          ],
          model: "gpt-3.5-turbo",
          temperature: 0.0, // Deterministic parsing
          max_tokens: 1500, // Reduced token limit for faster response
          top_p: 0.2, // More focused on likely tokens
          presence_penalty: -0.5, // Favor repetition/consistency
          response_format: { type: "json_object" },
        });
      } catch (parsingError) {
        console.error("Error from parsing API:", parsingError.message);
        return res.status(500).json({
          success: false,
          error: "Failed to parse syllabus with AI agent",
          details: parsingError.message,
        });
      }

      let parsedStructure;
      try {
        const content = parsingCompletion.choices[0]?.message?.content || "";
        console.log("Raw parser response length:", content.length);

        try {
          // Direct parsing should work with OpenAI's response_format: { type: "json_object" }
          parsedStructure = JSON.parse(content);
          console.log(
            "Parsed structure JSON parsed successfully on first attempt"
          );
        } catch (parseError) {
          console.log(
            "First parse attempt failed, checking for JSON code blocks"
          );

          // Fallback to code block extraction if needed
          const jsonBlockMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
          if (jsonBlockMatch && jsonBlockMatch[1]) {
            const jsonText = jsonBlockMatch[1];
            try {
              parsedStructure = JSON.parse(jsonText);
              console.log("Parsed structure JSON parsed from code block");
            } catch (innerError) {
              console.log(
                "JSON parsing from code block failed, trying to fix JSON"
              );
              const fixedJson = fixBrokenJSON(jsonText);
              parsedStructure = JSON.parse(fixedJson);
              console.log("Fixed parsed structure JSON successfully");
            }
          } else {
            console.log(
              "No JSON code blocks found, trying to fix entire content"
            );
            const fixedJson = fixBrokenJSON(content);
            parsedStructure = JSON.parse(fixedJson);
            console.log("Fixed parsed structure JSON successfully");
          }
        }

        if (!parsedStructure.parsed_structure) {
          if (parsedStructure.main_subject || parsedStructure.units) {
            parsedStructure = { parsed_structure: parsedStructure };
          } else {
            throw new Error(
              "Invalid parsed structure format - missing expected keys"
            );
          }
        }
      } catch (error) {
        console.error("Syllabus parsing failed:", error.message);
        return res.status(500).json({
          success: false,
          error: "Failed to parse syllabus",
          details: error.message,
        });
      }

      console.log("Generating mind map from parsed structure...");
      let mindMapCompletion;
      try {
        mindMapCompletion = await openai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are a mind map creation AI that transforms parsed syllabus structures into organized mind maps in JSON format. Convert the parsed structure into a mind map while keeping these objectives in mind:

1. Transform the parsed structure into mind map JSON format
2. Preserve the hierarchical structure
3. Create brief educational descriptions
4. Use the original titles
5. Ensure output is valid JSON with:
   - Double-quoted keys/values.
   - Correct commas (no trailing commas).
   - Escaped quotes in strings.
   - Balanced brackets (\`{\` matches \`}\`, \`[\` matches \`]\`).
   - No syntax errors.

---

### JSON OUTPUT STRUCTURE
{
  "mind_map": {
    "central_node": {
      "title": "Subject Name",
      "description": "Parsed description",
      "content": "Enhanced overview with objectives and applications"
    },
    "module_nodes": [
      {
        "title": "Main Topic Title",
        "content": "Rich description with objectives and context",
        "subtopics": [
          {
            "title": "Subtopic Title",
            "content": "Explanation with applications",
            "sub_subtopics": [
              {
                "title": "Sub-Subtopic Title",
                "content": "In-depth explanation with examples",
                "sub_sub_subtopics": []
              }
            ]
          }
        ]
      }
    ]
  }
}

---

### TRANSFORMATION RULES
1. **Map Main Subject**:
   - \`parsed_structure.main_subject.title\` → \`mind_map.central_node.title\`.
   - \`parsed_structure.main_subject.description\` → \`mind_map.central_node.description\`.
   - Enhance \`central_node.content\` with objectives, scope, and applications.
2. **Map Units**:
   - Each \`parsed_structure.units[i]\` → \`mind_map.module_nodes[i]\`.
   - Use \`units[i].title\` for \`module_nodes[i].title\`.
   - Enhance \`module_nodes[i].content\` with context and objectives.
3. **Map Subtopics**:
   - \`units[i].subtopics[j]\` → \`module_nodes[i].subtopics[j]\`.
   - Preserve deeper levels (\`sub_subtopics\`, etc.).
   - Generate \`content\` with importance and applications.
4. **Infinite Depth**:
   - Map all deeper hierarchies without truncation.
5. **Content Enhancement**:
   - Combine descriptions with:
     - Importance of the topic.
     - Practical applications/examples.
     - Connections to the subject.
   - Keep descriptions academic and concise (50–100 words).
6. **Handle Edge Cases**:
   - Empty subtopics: Use empty arrays (\`[]\`).
   - Missing descriptions: Generate from title/context.
   - Long descriptions: Summarize key details.

---

### JSON VALIDATION RULES
1. **Iterative Validation**: During generation:
   - Track open \`{\` and \`[\` brackets.
   - Ensure each has a matching \`}\` or \`]\` before proceeding.
   - Count brackets after each module to confirm balance.
2. **Final Validation**: Before outputting:
   - Parse the JSON string using a JSON parser (or simulate parsing).
   - If parsing fails, rebalance brackets and retry.
3. **Syntax Rules**:
   - All keys/values MUST be double-quoted (e.g., \`"title": "Value"\`).
   - Commas required between array items/properties, EXCEPT after the last item.
   - Escape quotes in strings (e.g., \`"Text with \\"quotes\\""\`).
   - No trailing commas.
   - No unquoted keys or values (except numbers, \`true\`, \`false\`, \`null\`).

---

### EXAMPLE INPUT 1: PARSED STRUCTURE (Introduction to Artificial Intelligence)
**Input Parsed Structure:**
\`\`\`json
{
  "parsed_structure": {
    "main_subject": {
      "title": "Introduction to Artificial Intelligence",
      "description": "Foundational study of AI, focusing on creating systems that learn, plan, and solve problems autonomously, covering problem solving, reasoning, planning, and machine learning"
    },
    "units": [
      {
        "title": "Introduction",
        "description": "Overview of AI concepts, including intelligent agents, problem formulation, and logical inference techniques",
        "subtopics": [
          {
            "title": "Intelligent Agents",
            "description": "Systems that perceive and act rationally in their environment",
            "sub_subtopics": []
          },
          {
            "title": "Problem Formulation",
            "description": "Defining problems for AI systems to solve",
            "sub_subtopics": []
          },
          {
            "title": "Logical Inference",
            "description": "Techniques like forward/backward chaining, unification, and resolution",
            "sub_subtopics": [
              {
                "title": "Forward and Backward Chaining",
                "description": "Methods for deriving conclusions from rules",
                "sub_sub_subtopics": []
              },
              {
                "title": "Resolution",
                "description": "Proof technique for logical statements",
                "sub_sub_subtopics": []
              }
            ]
          }
        ]
      },
      {
        "title": "Search and Planning",
        "description": "Strategies for state-space search and planning in AI systems",
        "subtopics": [
          {
            "title": "Search Strategies",
            "description": "Uninformed and informed search methods for problem solving",
            "sub_subtopics": [
              {
                "title": "Uninformed Search",
                "description": "Breadth-first, depth-first, and other blind search techniques",
                "sub_sub_subtopics": []
              },
              {
                "title": "Informed Search",
                "description": "Heuristic-based methods like A* search",
                "sub_sub_subtopics": []
              }
            ]
          },
          {
            "title": "Planning",
            "description": "State-space planning, partial-order planning, and real-world applications",
            "sub_subtopics": []
          }
        ]
      },
      {
        "title": "Knowledge Representation and Reasoning",
        "description": "Methods for representing and reasoning with knowledge in AI",
        "subtopics": [
          {
            "title": "Logical Agents",
            "description": "Agents that use logic to make decisions",
            "sub_subtopics": []
          },
          {
            "title": "Propositional Logic",
            "description": "Basic logic for representing knowledge",
            "sub_subtopics": []
          }
        ]
      }
    ]
  }
}
\`\`\`

**Expected Output:**
\`\`\`json
{
  "mind_map": {
    "central_node": {
      "title": "Introduction to Artificial Intelligence",
      "description": "Foundational study of AI, focusing on creating systems that learn, plan, and solve problems autonomously, covering problem solving, reasoning, planning, and machine learning",
      "content": "This course introduces AI, enabling computers to learn, plan, and solve problems autonomously. It covers core topics like search strategies, knowledge representation, uncertainty, and machine learning, with applications in robotics, vision, and more."
    },
    "module_nodes": [
      {
        "title": "Introduction",
        "content": "Explores foundational AI concepts, including how agents operate and how problems are formulated, setting the stage for advanced AI techniques",
        "subtopics": [
          {
            "title": "Intelligent Agents",
            "content": "Study of agents that act rationally, critical for autonomous systems like self-driving cars",
            "sub_subtopics": []
          },
          {
            "title": "Problem Formulation",
            "content": "Techniques to define problems for AI solutions, foundational for search and planning",
            "sub_subtopics": []
          },
          {
            "title": "Logical Inference",
            "content": "Methods like chaining and resolution for logical reasoning, used in expert systems",
            "sub_subtopics": [
              {
                "title": "Forward and Backward Chaining",
                "content": "Rule-based inference techniques for decision-making",
                "sub_sub_subtopics": []
              },
              {
                "title": "Resolution",
                "content": "Logical proof method for automated reasoning",
                "sub_sub_subtopics": []
              }
            ]
          }
        ]
      },
      {
        "title": "Search and Planning",
        "content": "Covers search algorithms and planning methods to solve complex AI problems efficiently",
        "subtopics": [
          {
            "title": "Search Strategies",
            "content": "Uninformed and informed search techniques, essential for pathfinding and optimization",
            "sub_subtopics": [
              {
                "title": "Uninformed Search",
                "content": "Blind search methods like BFS and DFS, used in simple AI tasks",
                "sub_sub_subtopics": []
              },
              {
                "title": "Informed Search",
                "content": "Heuristic-driven searches like A*, applied in game AI",
                "sub_sub_subtopics": []
              }
            ]
          }
        ]
      }
    ]
  }
}
\`\`\`

---

### CRITICAL SUCCESS CRITERIA
- Transform 100% of parsed structure content into mind map format.
- Preserve exact hierarchical relationships and infinite nesting depth.
- Generate enhanced, educational descriptions for all nodes.
- Produce clean, learner-friendly titles and content.
- Output perfect JSON syntax with no errors.
- Validate JSON structure iteratively during generation and before output.

---

**OUTPUT INSTRUCTIONS**:
- Respond with valid JSON only, starting with \`{\` and ending with \`}\`.
- Do NOT include markdown, code blocks (\`\`\`json), or explanations.
- Ensure all content is transformed and hierarchically organized.
- If JSON parsing fails during validation, rebalance brackets and retry before output.`,
            },
            {
              role: "user",
              content: `Please transform this parsed syllabus structure into a perfect mind map:

${JSON.stringify(parsedStructure)}

RESPOND WITH VALID MIND MAP JSON ONLY:`,
            },
          ],
          model: "gpt-3.5-turbo",
          temperature: 0.0, // Deterministic results
          max_tokens: 1500, // Further reduced for faster response
          top_p: 0.2, // More focused on likely tokens
          presence_penalty: -0.5, // Favor repetition/consistency
          response_format: { type: "json_object" },
        });
      } catch (mindMapError) {
        console.error(
          "Error from mind map creation API:",
          mindMapError.message
        );
        return res.status(500).json({
          success: false,
          error: "Failed to create mind map from parsed structure",
          details: mindMapError.message,
        });
      }

      let mindMapData;
      try {
        const content = mindMapCompletion.choices[0]?.message?.content || "";
        console.log("Raw mind map response length:", content.length);

        try {
          // Direct parsing should work with OpenAI's response_format: { type: "json_object" }
          mindMapData = JSON.parse(content);
          console.log("Mind map JSON parsed successfully on first attempt");
        } catch (parseError) {
          console.log(
            "First parse attempt failed, checking for JSON code blocks"
          );

          // Fallback to code block extraction if needed
          const jsonBlockMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
          if (jsonBlockMatch && jsonBlockMatch[1]) {
            const jsonText = jsonBlockMatch[1];
            try {
              mindMapData = JSON.parse(jsonText);
              console.log("Mind map JSON parsed from code block");
            } catch (innerError) {
              console.log(
                "JSON parsing from code block failed, trying to fix JSON"
              );
              const fixedJson = fixBrokenJSON(jsonText);
              mindMapData = JSON.parse(fixedJson);
              console.log("Fixed mind map JSON successfully");
            }
          } else {
            console.log(
              "No JSON code blocks found, trying to fix entire content"
            );
            const fixedJson = fixBrokenJSON(content);
            mindMapData = JSON.parse(fixedJson);
            console.log("Fixed mind map JSON successfully");
          }
        }

        if (!mindMapData.mind_map) {
          throw new Error("Invalid mind map format - missing 'mind_map' key");
        }
        if (!mindMapData.mind_map.central_node) {
          throw new Error("Invalid mind map format - missing 'central_node'");
        }
        if (!Array.isArray(mindMapData.mind_map.module_nodes)) {
          throw new Error(
            "Invalid mind map format - 'module_nodes' is not an array"
          );
        }
      } catch (error) {
        console.error("Mind map creation failed:", error.message);
        return res.status(500).json({
          success: false,
          error: "Failed to create mind map",
          details: error.message,
        });
      }

      let transformedData;
      try {
        transformedData = transformGroqResponse(mindMapData, subjectName);
      } catch (transformError) {
        console.error(
          "Error transforming mind map data:",
          transformError.message
        );
        return res.status(500).json({
          success: false,
          error: "Failed to transform mind map data",
          details: transformError.message,
        });
      }

      // userId is already declared at the top of this function
      let result;
      try {
        if (db) {
          result = await db.collection("mindmaps").insertOne({
            userId: userId,
            title: subjectName,
            data: transformedData,
            createdAt: new Date(),
            lastModified: new Date(),
            syllabus: syllabus,
          });
          console.log(
            `Mind map saved to database with ID: ${result.insertedId}`
          );
        }
      } catch (dbError) {
        console.error("Error saving mind map to database:", dbError.message);
      }

      res.status(201).json({
        success: true,
        message: "Mind map created successfully",
        mindMapId: result?.insertedId || null,
        mindMap: transformedData,
      });
    } catch (error) {
      console.error("Error generating mind map from syllabus:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to generate mind map from syllabus",
        details: error.message,
      });
    }
  }
);

// Endpoint for health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "UP",
    timestamp: new Date().toISOString(),
    dbConnected: !!db,
  });
});

// Mind Map Node Description Endpoint - Enhanced with multimedia content
app.post("/api/mindmap/node-description", verifyToken, async (req, res) => {
  try {
    const { nodeId, nodeLabel, syllabus, parentNodes, childNodes } = req.body;

    if (!nodeId || !nodeLabel) {
      return res.status(400).json({
        success: false,
        error: "Node ID and label are required",
      });
    }

    console.log(
      `Generating enhanced description for node: ${nodeLabel} (${nodeId})`
    ); // Start all searches in parallel for better performance
    const [searchResults, images, videos] = await Promise.allSettled([
      // Search for relevant web content
      tavilyClient
        .search(`${nodeLabel} explanation tutorial examples educational`, {
          search_depth: "basic",
          max_results: 5,
          include_answer: true,
          include_raw_content: false,
          include_images: false,
        })
        .catch((err) => {
          console.error("Tavily search error:", err);
          return { results: [] };
        }),

      // Search for relevant images
      searchImages(nodeLabel).catch((err) => {
        console.error("Image search error:", err);
        return [];
      }),

      // Search for educational videos
      searchEducationalVideos(nodeLabel).catch((err) => {
        console.error("Video search error:", err);
        return [];
      }),
    ]); // Extract results from settled promises
    const webResults =
      searchResults.status === "fulfilled"
        ? searchResults.value?.results || []
        : [];
    const imageResults = images.status === "fulfilled" ? images.value : [];
    const videoResults = videos.status === "fulfilled" ? videos.value : [];

    // Initialize Groq client with API key from environment variables
    const groq = new Groq({
      apiKey: process.env.DESCRIPTION_GROQ_API_KEY,
    });

    let nodeDescription;
    try {
      // Formulate context based on syllabus and node hierarchy
      const nodeContext = syllabus || "";
      const parentContext = parentNodes
        ? `This topic is part of: ${parentNodes
            .map((n) => n.label)
            .join(" > ")}`
        : "";
      const childContext =
        childNodes && childNodes.length > 0
          ? `This topic includes subtopics: ${childNodes
              .map((n) => n.label)
              .join(", ")}`
          : ""; // Prepare web search context
      const webContext =
        webResults.length > 0
          ? `\n\nAdditional web resources found:\n${webResults
              .slice(0, 3)
              .map(
                (result) =>
                  `- ${result.title}: ${
                    result.content?.substring(0, 150) ||
                    result.raw_content?.substring(0, 150) ||
                    "No description available"
                  }...`
              )
              .join("\n")}`
          : "";

      // Create the prompt for the AI
      nodeDescription = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an exceptional educational AI designed to create detailed, informative, and engaging learning content about any topic. When given a topic and context, you will generate a comprehensive explanation (350-450 words) that is perfectly formatted for educational purposes.

Your response should:
1. Be comprehensive and educational (350-450 words)
2. Include proper formatting with markdown headings, bullet points, and emphasis where appropriate
3. Include KaTeX mathematical equations when relevant (using LaTeX syntax with $$ for display equations and $ for inline equations)
4. Include code snippets with proper syntax highlighting when relevant to programming or technical topics
5. Be tailored to the specific topic, considering its context, parent topics, and subtopics
6. Be academically rigorous yet accessible, with clear explanations of complex concepts
7. Include concrete examples, applications, or analogies where appropriate
8. Reference or incorporate insights from provided web resources when relevant

Formatting requirements:
- Use markdown formatting (## for headings, * for bullet points, etc.)
- For mathematical equations, use LaTeX syntax with $$ for display equations and $ for inline equations
- For code, use triple backticks with language identifier (e.g. \`\`\`python)
- Ensure all formatting is consistent and readable
- Structure should include: 
  * A brief introduction to the topic
  * Main content with appropriate headings
  * Key concepts clearly explained
  * Examples, applications or visualizations described (where relevant)
  * Brief conclusion or connection to related concepts

At the end, include a "## 📚 Further Learning" section that mentions the availability of visual resources and educational videos for deeper understanding.

Your explanation should be authoritative, academically accurate, and designed to enhance understanding of the topic in its educational context.`,
          },
          {
            role: "user",
            content: `Generate a comprehensive educational description for the topic: "${nodeLabel}"

Context:
${nodeContext}

${parentContext}
${childContext}
${webContext}

Please provide a 350-450 word detailed description with proper formatting, including any necessary equations (using KaTeX/LaTeX syntax), code examples, or visual descriptions as appropriate for this specific topic.`,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 1200,
        top_p: 0.9,
      });
    } catch (descriptionError) {
      console.error("Error from Groq API:", descriptionError.message);
      return res.status(500).json({
        success: false,
        error: "Failed to generate node description",
        details: descriptionError.message,
      });
    }

    // Extract the content from the response
    const descriptionContent =
      nodeDescription.choices[0]?.message?.content || "";

    // Prepare multimedia content for response
    const multimedia = {
      images: imageResults.slice(0, 3).map((img) => ({
        url: img.url,
        title: img.title || `${nodeLabel} illustration`,
        source: img.source,
        thumbnail: img.thumbnail,
      })),
      videos: videoResults.slice(0, 2).map((video) => ({
        videoId: video.videoId,
        title: video.title,
        description:
          video.description?.substring(0, 150) +
          (video.description?.length > 150 ? "..." : ""),
        thumbnail: video.thumbnail,
        embedUrl: video.embedUrl,
        channelTitle: video.channelTitle,
        publishedAt: video.publishedAt,
      })),
      references: webResults.slice(0, 5).map((result) => ({
        title: result.title,
        url: result.url,
        snippet:
          (result.content || result.raw_content || "")?.substring(0, 200) +
          ((result.content || result.raw_content || "").length > 200
            ? "..."
            : ""),
        score: result.score || 0,
      })),
    };

    console.log(
      `Enhanced description generated with ${multimedia.images.length} images, ${multimedia.videos.length} videos, and ${multimedia.references.length} references`
    );

    // Return the enhanced description with multimedia content
    return res.json({
      success: true,
      description: descriptionContent,
      multimedia: multimedia,
    });
  } catch (error) {
    console.error("Error generating enhanced node description:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate enhanced node description",
      details: error.message,
    });
  }
});

// Mind Map Podcast Generation Endpoint
app.post("/api/mindmap/generate-podcast", verifyToken, async (req, res) => {
  try {
    const { nodeId, topic, description } = req.body;

    if (!nodeId || !topic) {
      return res.status(400).json({
        success: false,
        error: "Node ID and topic are required",
      });
    }

    console.log(`Generating podcast for topic: ${topic} (${nodeId})`);

    // Initialize the ElevenLabs service
    await elevenLabsService.initialize();

    // Generate podcast script using Gemini
    const podcastScript = await elevenLabsService.generatePodcastScript(
      topic,
      description
    );

    // Convert script to audio using ElevenLabs
    const result = await elevenLabsService.convertScriptToAudio(
      podcastScript,
      nodeId
    );

    if (!result || !result.audioUrl) {
      throw new Error("Failed to generate podcast audio");
    }

    // Return the URL to the generated podcast
    return res.json({
      success: true,
      podcastUrl: result.audioUrl,
      script: result.script,
    });
  } catch (error) {
    console.error("Error generating podcast:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate podcast",
      details: error.message,
    });
  }
});

// Mind Map Node Read Status Endpoints
app.put(
  "/api/mindmap/:mindMapId/node/:nodeId/read-status",
  verifyToken,
  async (req, res) => {
    try {
      const { mindMapId, nodeId } = req.params;
      const { isRead } = req.body;
      const userId = req.user.uid;

      if (!mindMapId || !nodeId) {
        return res.status(400).json({
          success: false,
          error: "Mind map ID and node ID are required",
        });
      }

      if (typeof isRead !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "isRead must be a boolean value",
        });
      }

      // Connect to database
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      const db = client.db("adhyayan_ai");

      // Find or create user progress document
      const progressCollection = db.collection("user_progress");
      const progressQuery = { userId, mindMapId };

      let progressDoc = await progressCollection.findOne(progressQuery);

      if (!progressDoc) {
        // Create new progress document
        progressDoc = {
          userId,
          mindMapId,
          nodeReadStatus: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // Update the read status for the specific node
      progressDoc.nodeReadStatus = progressDoc.nodeReadStatus || {};
      progressDoc.nodeReadStatus[nodeId] = isRead;
      progressDoc.updatedAt = new Date();

      // Upsert the document
      await progressCollection.replaceOne(progressQuery, progressDoc, {
        upsert: true,
      });

      await client.close();

      console.log(
        `Updated read status for node ${nodeId} in mind map ${mindMapId}: ${isRead}`
      );

      res.json({
        success: true,
        message: "Node read status updated successfully",
        nodeId,
        isRead,
      });
    } catch (error) {
      console.error("Error updating node read status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update node read status",
        details: error.message,
      });
    }
  }
);

// Get read status for all nodes in a mind map
app.get(
  "/api/mindmap/:mindMapId/read-status",
  verifyToken,
  async (req, res) => {
    try {
      const { mindMapId } = req.params;
      const userId = req.user.uid;

      if (!mindMapId) {
        return res.status(400).json({
          success: false,
          error: "Mind map ID is required",
        });
      }

      // Connect to database
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      const db = client.db("adhyayan_ai");

      // Get user progress document
      const progressCollection = db.collection("user_progress");
      const progressDoc = await progressCollection.findOne({
        userId,
        mindMapId,
      });

      await client.close();

      const nodeReadStatus = progressDoc
        ? progressDoc.nodeReadStatus || {}
        : {};

      res.json({
        success: true,
        nodeReadStatus,
      });
    } catch (error) {
      console.error("Error fetching node read status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch node read status",
        details: error.message,
      });
    }
  }
);

// Mind Map Node Questions Generator Endpoint - Generates AI questions based on node content
app.post("/api/mindmap/node-questions", verifyToken, async (req, res) => {
  try {
    const { nodeId, nodeDescription } = req.body;

    if (!nodeId || !nodeDescription) {
      return res.status(400).json({
        success: false,
        error: "Node ID and description are required",
      });
    }

    console.log(`Generating contextual questions for node: ${nodeId}`);

    try {
      // Use the dedicated Gemini API key for question generation
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.QUERY_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an AI tutor that generates engaging questions about educational content that a student might have.

Given the following educational content about "${nodeId}", generate exactly 5 relevant questions that a student might ask after reading this content.

The questions should:
1. Cover different aspects of the content
2. Range from basic understanding to deeper insights
3. Be conversational and natural sounding
4. Be specific to the content provided
5. Encourage critical thinking

Content:
${nodeDescription}

IMPORTANT: Return ONLY a valid JSON array with exactly 5 question strings. Do not include any markdown formatting, code blocks, or explanations. Do not wrap the response in backticks or any other formatting.

Example of the exact format required:
["What is the main purpose of this process?", "How does this relate to other concepts?", "What factors influence this mechanism?", "Can you provide a real-world example?", "What would happen if this process failed?"]

Your response must be a valid JSON array that can be parsed directly:`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 500,
              topP: 0.8,
              topK: 10,
            },
          }),
        }
      );

      const data = await response.json(); // Extract the generated content from Gemini response
      let questionText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

      // Clean up the response - remove markdown code blocks if present
      questionText = questionText
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();

      // Parse the JSON array of questions or return default questions if parsing fails
      let questions;
      try {
        questions = JSON.parse(questionText);

        // Validate that we got an array of strings
        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error("Invalid response format - not an array");
        }

        // Ensure we have exactly 5 questions and they are all strings
        questions = questions
          .filter((q) => typeof q === "string" && q.trim().length > 0)
          .slice(0, 5);

        if (questions.length < 5) {
          // Fill with default questions if we don't have enough
          const defaultQuestions = [
            "Tell me more about this topic",
            "What are the key concepts here?",
            "How does this relate to other topics?",
            "Can you explain this in simple terms?",
            "What should I focus on learning?",
          ];
          while (questions.length < 5) {
            questions.push(
              defaultQuestions[questions.length] || "What else should I know?"
            );
          }
        }
      } catch (parseError) {
        console.error("Failed to parse questions response:", parseError);
        console.log("Raw response text:", questionText);
        questions = [
          "Tell me more about this topic",
          "What are the key concepts here?",
          "How does this relate to other topics?",
          "Can you explain this in simple terms?",
          "What should I focus on learning?",
        ];
      }

      return res.json({
        success: true,
        questions,
      });
    } catch (apiError) {
      console.error("Error calling Gemini API:", apiError);

      // Return default questions on API error
      return res.json({
        success: true,
        questions: [
          "Tell me more about this topic",
          "What are the key concepts here?",
          "How does this relate to other topics?",
          "Can you explain this in simple terms?",
          "What should I focus on learning?",
        ],
      });
    }
  } catch (error) {
    console.error("Error generating node questions:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate questions",
      details: error.message,
    });
  }
});

// Mind Map Chat Response Generator Endpoint
app.post("/api/mindmap/chat-response", verifyToken, async (req, res) => {
  try {
    const { nodeId, nodeDescription, userMessage } = req.body;

    if (!nodeId || !nodeDescription || !userMessage) {
      return res.status(400).json({
        success: false,
        error: "Node ID, description and user message are required",
      });
    }

    console.log(
      `Generating chat response for node ${nodeId} and message: ${userMessage.substring(
        0,
        50
      )}...`
    );

    try {
      // Use the dedicated Gemini API key for responses
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.QUERY_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are a helpful and knowledgeable AI tutor specialized in educational content. You need to respond to a user's question about a specific topic.

Topic Content:
${nodeDescription}

User Question: "${userMessage}"

Provide a clear, informative, and educational response to the user's question. Your response should:
1. Be comprehensive and educational (200-300 words)
2. Include proper formatting with markdown headings, bullet points, and emphasis where appropriate
3. Include KaTeX mathematical equations when relevant (using LaTeX syntax with $$ for display equations and $ for inline equations)
4. Include code snippets with proper syntax highlighting when relevant to programming or technical topics
5. Be tailored to answering the specific question
6. Be academically rigorous yet accessible, with clear explanations of complex concepts
7. Stay focused on the topic at hand and directly address the user's question
8. Provide specific examples or applications if relevant

Your tone should be that of a knowledgeable and engaging tutor who's passionate about helping students understand the material.`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1024,
              topP: 0.9,
            },
          }),
        }
      );

      const data = await response.json();

      // Extract the generated content from Gemini response
      const responseContent =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!responseContent) {
        throw new Error("Empty response from Gemini API");
      }

      return res.json({
        success: true,
        response: responseContent,
      });
    } catch (apiError) {
      console.error("Error calling Gemini API for chat response:", apiError);

      // Return default response on API error
      return res.json({
        success: true,
        response:
          "I apologize, but I'm having trouble generating a response right now. Could you try asking your question in a different way, or ask about another aspect of this topic?",
      });
    }
  } catch (error) {
    console.error("Error generating chat response:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate response",
      details: error.message,
    });
  }
});

// Mind Map Node Expansion Endpoint - Generate sub-nodes for leaf nodes
app.post("/api/mindmap/expand-node", verifyToken, async (req, res) => {
  try {
    const { mindMapId, nodeId, nodeTitle, nodeDescription, currentLevel } =
      req.body;

    if (!mindMapId || !nodeId || !nodeTitle) {
      return res.status(400).json({
        success: false,
        error: "Mind map ID, node ID, and node title are required",
      });
    }

    const userId = req.user.uid;
    console.log(`Expanding node: ${nodeTitle} (${nodeId}) for user: ${userId}`); // Get the mind map subject context first
    let subjectContext = "General Academic Subject";
    let parentSubject = "";

    if (db && mindMapId) {
      try {
        let mindMap = null;
        console.log(
          `Attempting to find mind map with ID: ${mindMapId} for user: ${userId}`
        );

        // Try multiple strategies to find the mind map
        const searchStrategies = [
          // Strategy 1: Standard MongoDB ObjectId format
          () =>
            ObjectId.isValid(mindMapId)
              ? db
                  .collection("mindmaps")
                  .findOne({ _id: new ObjectId(mindMapId), userId: userId })
              : null,

          // Strategy 2: Custom mindMapId field
          () =>
            db
              .collection("mindmaps")
              .findOne({ mindMapId: mindMapId, userId: userId }),

          // Strategy 3: Custom customId field
          () =>
            db
              .collection("mindmaps")
              .findOne({ customId: mindMapId, userId: userId }),

          // Strategy 4: Search by ID as string in _id field
          () =>
            db
              .collection("mindmaps")
              .findOne({ _id: mindMapId, userId: userId }),

          // Strategy 5: Search by any field containing the mindMapId
          () =>
            db.collection("mindmaps").findOne({
              $or: [
                { mindMapId: mindMapId },
                { customId: mindMapId },
                { _id: mindMapId },
                { id: mindMapId },
              ],
              userId: userId,
            }),
          // Strategy 6: Enhanced partial match for timestamp-based IDs like mindmap_1750469769837
          () => {
            if (mindMapId.includes("mindmap_") || mindMapId.includes("_")) {
              const timestamp = mindMapId
                .replace(/mindmap_?/i, "")
                .replace(/[^0-9]/g, "");
              if (timestamp.length >= 10) {
                // Unix timestamp length
                console.log(
                  `Searching for mind map with timestamp: ${timestamp}`
                );
                return db.collection("mindmaps").findOne({
                  $or: [
                    { mindMapId: { $regex: timestamp, $options: "i" } },
                    { customId: { $regex: timestamp, $options: "i" } },
                    { _id: { $regex: timestamp, $options: "i" } },
                    {
                      createdAt: {
                        $gte: new Date(parseInt(timestamp) - 86400000),
                        $lte: new Date(parseInt(timestamp) + 86400000),
                      },
                    }, // Within 24 hours
                  ],
                  userId: userId,
                });
              }
            }
            return null;
          },

          // Strategy 7: Search by creation time approximation for timestamp IDs
          () => {
            const idNum = mindMapId.replace(/[^0-9]/g, "");
            if (idNum.length >= 10) {
              const possibleTimestamp = parseInt(idNum);
              if (possibleTimestamp > 1000000000) {
                // Valid timestamp range
                console.log(
                  `Searching for mind map near timestamp: ${possibleTimestamp}`
                );
                return db.collection("mindmaps").findOne({
                  userId: userId,
                  $or: [
                    {
                      createdAt: {
                        $gte: new Date(possibleTimestamp - 3600000),
                        $lte: new Date(possibleTimestamp + 3600000),
                      },
                    }, // Within 1 hour
                    {
                      lastModified: {
                        $gte: new Date(possibleTimestamp - 3600000),
                        $lte: new Date(possibleTimestamp + 3600000),
                      },
                    },
                  ],
                });
              }
            }
            return null;
          },
        ];

        // Try each strategy until we find the mind map
        for (let i = 0; i < searchStrategies.length && !mindMap; i++) {
          try {
            const strategy = searchStrategies[i];
            const result = await strategy();
            if (result) {
              mindMap = result;
              console.log(
                `Found mind map using strategy ${i + 1}: ${JSON.stringify({
                  _id: mindMap._id,
                  title: mindMap.title,
                  mindMapId: mindMap.mindMapId,
                })}`
              );
              break;
            }
          } catch (strategyError) {
            console.log(`Strategy ${i + 1} failed:`, strategyError.message);
            continue;
          }
        }

        // If still not found, try to get any recent mind map for the user as context
        if (!mindMap) {
          console.log(
            `No mind map found with direct ID match, searching for recent mind maps for user: ${userId}`
          );
          const recentMindMaps = await db
            .collection("mindmaps")
            .find({ userId: userId })
            .sort({ createdAt: -1, lastModified: -1 })
            .limit(5)
            .toArray();

          console.log(
            `Found ${recentMindMaps.length} recent mind maps for user`
          );
          if (recentMindMaps.length > 0) {
            // Use the most recent mind map for context
            mindMap = recentMindMaps[0];
            console.log(
              `Using most recent mind map for context: ${mindMap.title}`
            );
          }
        }
        if (mindMap && mindMap.title) {
          // Check if the mind map title is generic/placeholder and doesn't make sense for the node
          const isGenericTitle =
            /^(oops|test|temp|demo|example|untitled|new|default|placeholder|mindmap)$/i.test(
              mindMap.title.trim()
            );

          if (isGenericTitle) {
            console.log(
              `Mind map title "${mindMap.title}" appears to be generic/placeholder - letting AI determine context from node title instead`
            );
            subjectContext = `Academic Subject (infer from "${nodeTitle}")`;
            parentSubject = `Academic Subject (infer from "${nodeTitle}")`;
            console.log(
              `Will let OpenAI intelligently determine domain from node title: "${nodeTitle}"`
            );
          } else {
            subjectContext = mindMap.title;
            parentSubject = mindMap.title;
            console.log(
              `Using subject context from mind map: ${subjectContext}`
            );
          }
        } else {
          console.log(
            `No mind map found for ID: ${mindMapId}, will let OpenAI determine context from node title`
          );
          subjectContext = `Academic Subject (infer from "${nodeTitle}")`;
          parentSubject = `Academic Subject (infer from "${nodeTitle}")`;
          console.log(
            `Will let OpenAI intelligently determine domain from node title: "${nodeTitle}"`
          );
        }
      } catch (dbError) {
        console.error("Error fetching mind map context:", dbError);
        console.log(
          "Will let OpenAI determine context from node title as fallback"
        );
        subjectContext = `Academic Subject (infer from "${nodeTitle}")`;
        parentSubject = `Academic Subject (infer from "${nodeTitle}")`;
        console.log(
          `Fallback: Will let OpenAI intelligently determine domain from node title: "${nodeTitle}"`
        );
      }
    } else {
      console.log(
        "No database or mindMapId available, will let OpenAI determine context from node title"
      );
      subjectContext = `Academic Subject (infer from "${nodeTitle}")`;
      parentSubject = `Academic Subject (infer from "${nodeTitle}")`;
      console.log(
        `No DB: Will let OpenAI intelligently determine domain from node title: "${nodeTitle}"`
      );
    }
    try {
      // Use OpenAI with dedicated API key for node expansion
      const expandOpenAI = new OpenAI({
        apiKey: process.env.EXPAND_NODE_API_KEY,
        maxRetries: 2,
        httpAgent: {
          keepAlive: true,
        },
      }); // Log the final context being sent to AI for domain validation
      console.log(`🎯 CONTEXT SUMMARY FOR AI:
        - Node Title: "${nodeTitle}"
        - Subject Context: "${subjectContext}"
        - Mind Map ID: ${mindMapId}
        - AI Task: Intelligently determine domain from node title and generate appropriate sub-topics`);

      const completion = await expandOpenAI.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an exceptionally advanced educational AI specialized in creating deep, hierarchically structured learning pathways. You possess the knowledge architecture of the world's best textbook authors, curriculum designers, and educational specialists. Your mission is to expand educational topics by creating TRUE NESTED HIERARCHIES of knowledge that represent how topics are ACTUALLY taught and learned in depth.

🧠 **EDUCATIONAL DEPTH ARCHITECTURE**:

**PHASE 1: PRECISE EDUCATIONAL DOMAIN ANALYSIS**

Before generating sub-topics, perform deep educational domain analysis:

1. **Educational Taxonomy Analysis**: Analyze "${nodeTitle}" through the lens of actual curricula:
   - **Curriculum Structure Recognition**: Identify how this topic is divided in actual textbooks
     • "Polymorphism" → Compile-time vs. Runtime, Method Overloading vs. Overriding, etc.
     • "Photosynthesis" → Light-Dependent Reactions vs. Calvin Cycle, C3 vs. C4 pathways, etc.
     • "Constitutional Law" → Judicial Review, Commerce Clause, Equal Protection, etc.
   - **Knowledge Prerequisite Chains**: Map what must be learned before what
   - **Conceptual Complexity Progression**: Identify natural learning sequences
   - **Educational Resource Organization**: Analyze how leading textbooks structure the topic

2. **Deep Learning Path Matrix**: Analyze all available educational signals:
   - **Course Context**: "${subjectContext}"
   - **Learning Focus**: "${nodeTitle}"
   ${nodeDescription ? `- **Topic Description**: "${nodeDescription}"` : ""}
   - **Learning Depth Level**: ${currentLevel || "unknown"}
   - **Educational Pattern Recognition**: Match against academic curriculum structures

3. **CRITICAL DOMAIN DETECTION & LOCK-IN**:
   
   **STEP 1: INTELLIGENT DOMAIN DETECTION**
   Analyze the topic "${nodeTitle}" and context "${subjectContext}" to determine the PRIMARY academic domain:
   
   Use your natural language understanding to identify the academic field:
   - Computer Science/Programming (algorithms, coding, software, data structures, etc.)
   - Biology/Life Sciences (cells, DNA, ecology, evolution, physiology, etc.) 
   - Physics (forces, energy, quantum mechanics, electromagnetism, etc.)
   - Chemistry (reactions, molecules, bonding, organic chemistry, etc.)
   - Mathematics (equations, proofs, calculus, algebra, geometry, etc.)
   - Other academic disciplines
   
   **STEP 2: DOMAIN LOCK-IN PROTOCOL**
   Once you identify the domain, ALL sub-topics MUST remain within that domain. NO cross-domain contamination allowed.
   
   **STEP 3: DOMAIN-SPECIFIC EXPANSION RULES**:

   **🖥️ COMPUTER SCIENCE/PROGRAMMING DOMAIN EXPANSION**:
   - **Programming Language Concepts**: Syntax → Semantics → Implementation → Optimization
   - **Software Architecture**: Design Patterns → Components → Systems → Scalability  
   - **Algorithm Analysis**: Problem → Approach → Implementation → Complexity → Variants
   - **Data Structures**: Abstract Data Type → Implementation → Operations → Use Cases → Performance
   - **System Programming**: Hardware → OS → Runtime → Memory Management → Concurrency
   - **Web Development**: Frontend → Backend → Database → API → Deployment → Security
   - **Machine Learning**: Theory → Algorithms → Implementation → Training → Evaluation → Applications
   - **Database Systems**: Schema → Queries → Transactions → Concurrency → Distributed Systems
   - **Network Programming**: Protocols → Sockets → Client-Server → Distributed → Security
   - **Software Engineering**: Requirements → Design → Implementation → Testing → Maintenance

   **🧬 BIOLOGY DOMAIN EXPANSION** (ONLY if topic is clearly biological):
   - **Molecular Biology**: Molecules → Structures → Functions → Interactions → Regulation
   - **Cell Biology**: Structure → Function → Division → Communication → Death
   - **Genetics**: Inheritance → Expression → Regulation → Variation → Evolution
   - **Physiology**: Systems → Organs → Tissues → Cells → Molecular Mechanisms
   - **Ecology**: Populations → Communities → Ecosystems → Biosphere → Conservation

   **⚗️ CHEMISTRY DOMAIN EXPANSION** (ONLY if topic is clearly chemical):
   - **Organic Chemistry**: Structure → Reactions → Mechanisms → Synthesis → Applications
   - **Physical Chemistry**: Thermodynamics → Kinetics → Quantum → Spectroscopy → Statistical Mechanics

   **🔬 PHYSICS DOMAIN EXPANSION** (ONLY if topic is clearly physics):
   - **Classical Mechanics**: Forces → Motion → Energy → Momentum → Rotation → Oscillations
   - **Quantum Physics**: Wave-Particle Duality → Uncertainty → Entanglement → Applications
   - **Electromagnetism**: Electric Fields → Magnetic Fields → Waves → Circuits → Applications

   **📊 MATHEMATICS DOMAIN EXPANSION** (ONLY if topic is clearly mathematical):
   - **Analysis**: Limits → Continuity → Derivatives → Integrals → Series → Applications
   - **Algebra**: Groups → Rings → Fields → Linear Algebra → Abstract Algebra

   **CRITICAL RULE**: If "${nodeTitle}" contains ANY programming/CS keywords OR "${subjectContext}" suggests computer science, ONLY generate CS/programming sub-topics. NO biology, chemistry, or other domain topics allowed.

4. **ENHANCED DOMAIN-SPECIFIC EXAMPLES & STRICT BOUNDARIES**:

   **🖥️ COMPUTER SCIENCE EXAMPLES (USE ONLY FOR CS/PROGRAMMING TOPICS)**:
   
   **"Polymorphism" in Object-Oriented Programming**:
   - **Compile-time Polymorphism**: Method Overloading, Operator Overloading, Function Templates, Generic Programming
   - **Runtime Polymorphism**: Method Overriding, Virtual Functions, Dynamic Dispatch, Abstract Classes
   - **Parametric Polymorphism**: Generics in Java, Templates in C++, Type Parameters, Bounded Types
   - **Subtype Polymorphism**: Inheritance Hierarchies, Interface Implementation, Liskov Substitution Principle
   - **Ad-hoc Polymorphism**: Function Overloading, Operator Overloading, Type Coercion

   **"Algorithms" in Computer Science**:
   - **Sorting Algorithms**: Comparison-based (QuickSort, MergeSort, HeapSort), Non-comparison (Counting Sort, Radix Sort)
   - **Search Algorithms**: Linear Search, Binary Search, Hash-based Search, Tree Traversal
   - **Graph Algorithms**: DFS, BFS, Dijkstra's Algorithm, Floyd-Warshall, Minimum Spanning Tree
   - **Dynamic Programming**: Optimal Substructure, Overlapping Subproblems, Memoization, Tabulation
   - **Greedy Algorithms**: Activity Selection, Huffman Coding, Fractional Knapsack

   **"Data Structures" in Programming**:
   - **Linear Data Structures**: Arrays, Linked Lists, Stacks, Queues, Deques
   - **Non-linear Data Structures**: Trees (Binary, BST, AVL, Red-Black), Graphs, Heaps
   - **Hash-based Structures**: Hash Tables, Hash Maps, Hash Sets, Collision Resolution
   - **Advanced Structures**: Tries, Segment Trees, Fenwick Trees, Disjoint Set Union

   **"Machine Learning" in AI/CS**:
   - **Supervised Learning**: Linear Regression, Logistic Regression, Decision Trees, Random Forest, SVM, Neural Networks
   - **Unsupervised Learning**: K-Means Clustering, Hierarchical Clustering, PCA, t-SNE
   - **Deep Learning**: Feedforward Networks, CNNs, RNNs, LSTMs, Transformers, GANs
   - **Reinforcement Learning**: Q-Learning, Policy Gradients, Actor-Critic, Deep Q-Networks

   **"Web Development" in Software Engineering**:
   - **Frontend Technologies**: HTML, CSS, JavaScript, React, Angular, Vue.js, TypeScript
   - **Backend Technologies**: Node.js, Express, Django, Flask, Spring Boot, REST APIs, GraphQL
   - **Database Technologies**: SQL (MySQL, PostgreSQL), NoSQL (MongoDB, Redis), ORMs
   - **DevOps & Deployment**: Docker, Kubernetes, CI/CD, AWS, Azure, Microservices

   **⚠️ STRICT DOMAIN BOUNDARY ENFORCEMENT**:
   
   **RULE 1**: If the topic contains words like "programming", "code", "algorithm", "software", "class", "method", "function", "API", "framework", "database", "web", "app", "system", "network", "security", "data structure", "OOP", "machine learning", etc., then ONLY generate Computer Science sub-topics.
   
   **RULE 2**: If the subject context mentions "Computer Science", "Programming", "Software Engineering", "Information Technology", "CS", "IT", "Software Development", "Web Development", etc., then ONLY generate CS/programming sub-topics.
   
   **RULE 3**: NEVER mix domains. If it's a CS topic, do NOT include biology, chemistry, physics, or other domain concepts.
   
   **RULE 4**: Use proper CS terminology that appears in actual programming textbooks, documentation, and computer science curricula.

**PHASE 2: EDUCATIONAL DEPTH MODELING**

For each academic domain, focus on creating TRUE EDUCATIONAL HIERARCHIES:

🖥️ **COMPUTER SCIENCE EDUCATIONAL HIERARCHIES**:
- **Programming Concepts**: Abstract → Concrete (e.g., OOP → Classes → Inheritance → Polymorphism → Method Overriding)
- **Algorithm Structures**: Strategy → Implementation (e.g., Sorting → Comparison-based → Divide & Conquer → QuickSort → Partitioning)
- **System Design**: Architecture → Components (e.g., Web Apps → Frontend → Component Model → State Management → Reducers)
- **Theoretical CS**: Proofs → Applications (e.g., Complexity → NP-Completeness → Reduction → SAT Problem → Cook-Levin Theorem)
- **Data Structures**: Interface → Implementation (e.g., Maps → Hash Tables → Collision Resolution → Open Addressing → Linear Probing)

🧬 **BIOLOGY EDUCATIONAL HIERARCHIES**:
- **Molecular Processes**: Overview → Mechanisms (e.g., Protein Synthesis → Transcription → RNA Processing → Alternative Splicing)
- **System Functions**: System → Process → Mechanism (e.g., Respiration → Gas Exchange → Alveolar Function → Surfactant Action)
- **Disease Pathways**: Condition → Causes → Mechanisms (e.g., Cancer → Mutations → Oncogenes → RAS Signaling Pathway)
- **Ecological Relationships**: Macro → Micro (e.g., Ecosystems → Population Dynamics → Predator-Prey → Lotka-Volterra Equations)
- **Evolutionary Processes**: Theory → Mechanisms (e.g., Natural Selection → Genetic Drift → Bottleneck Effect → Founder Effect)

⚗️ **PHYSICAL SCIENCES EDUCATIONAL HIERARCHIES**:
- **Physical Laws**: Principle → Applications → Exceptions (e.g., Thermodynamics → Entropy → Statistical Mechanics → Fluctuation Theorems)
- **Chemical Reactions**: General → Specific (e.g., Organic Reactions → Nucleophilic Substitution → SN1 → Carbocation Rearrangement)
- **Quantum Concepts**: Principle → Mathematical Framework → Applications (e.g., Wave-Particle Duality → Wave Functions → Tunneling Effect)
- **Astrophysical Structures**: Large → Small (e.g., Galaxy Formation → Spiral Structure → Density Waves → Star Formation Triggers)
- **Material Properties**: Macro → Micro (e.g., Conductivity → Band Theory → Electron Mobility → Scattering Mechanisms)

📊 **MATHEMATICS EDUCATIONAL HIERARCHIES**:
- **Theorem Development**: Statement → Proof Technique → Applications → Extensions
- **Concept Progression**: Definition → Properties → Special Cases → Generalizations
- **Proof Complexity**: Direct → Contradiction → Induction → Construction → Advanced Techniques
- **Application Chain**: Pure Concept → Applied Framework → Computational Method → Real-world Usage

�️ **ENGINEERING EDUCATIONAL HIERARCHIES**:
- **Design Process**: Requirements → Constraints → Solutions → Optimization → Implementation
- **System Analysis**: Whole System → Subsystems → Components → Element Interactions
- **Performance Evaluation**: Criteria → Metrics → Measurement → Improvement Methodology
- **Implementation Specifics**: General Approach → Technical Details → Edge Cases → Optimizations

**PHASE 3: TRUE HIERARCHICAL KNOWLEDGE STRUCTURE**

Design sub-topics that represent an AUTHENTIC educational deep dive:

1. **Actual Learning Sequence**: Match how the topic is taught in advanced university courses
2. **Textbook Chapter Organization**: Mirror how specialized textbooks divide this specific topic
3. **Prerequisite Knowledge Structure**: Follow the natural knowledge dependencies in the field
4. **Specificity Progression**: General principles → Specific mechanisms → Specialized applications
5. **Depth vs. Breadth Balance**: Cover both key theoretical foundations and significant variants

**PHASE 4: REAL EDUCATIONAL QUALITY STANDARDS**

Each sub-topic must follow genuine educational design principles:

- **Authentic Terminology**: Use terms that appear in ACTUAL TEXTBOOKS and COURSE SYLLABI for this topic
- **Natural Sub-divisions**: Create sub-topics that represent how this topic is ACTUALLY divided in educational resources
- **True Conceptual Depth**: Each sub-topic should be a legitimate concept that requires its own detailed learning, not a superficial category
- **Educational Utility**: Sub-topics should represent knowledge units that would actually be TAUGHT SEPARATELY in courses
- **Learning Sequence Logic**: Follow the order in which these concepts would actually be taught in advanced courses
- **Specificity Over Generality**: Create specific concept nodes (e.g., "Method Overriding") not generic categories (e.g., "Types of Polymorphism")

🎯 **EDUCATIONAL DEPTH OUTPUT SPECIFICATIONS**:

Generate exactly 3-5 sub-topics that demonstrate:
- **Textbook-quality Organization**: Sub-topics should mirror how specialized textbooks divide this topic
- **Curriculum Alignment**: Match how actual university courses organize this material
- **Knowledge Dependency Awareness**: Follow the natural learning prerequisites in the field
- **Scholarly Recognition**: Use divisions recognized by scholars as proper sub-components
- **Teachable Units**: Each sub-topic should represent a concept that could be taught in a dedicated lesson

**EDUCATIONAL JSON OUTPUT FORMAT**:
{
  "subNodes": [
    {
      "title": "Specific Educational Concept Using Standard Terminology",
      "description": "Clear, accurate educational explanation (150-250 words) using terminology found in actual textbooks. Explain the concept as if writing for an advanced textbook section, focusing on what students need to understand about this specific aspect of the parent topic. Include its importance, key principles, how it relates to the main topic, and notable applications or examples.",
      "hasChildren": true
    }
  ]
}

🎓 **EDUCATIONAL DEPTH PROTOCOL**:

1. **ANALYZE**: Examine how this topic is actually taught in advanced educational settings
2. **MODEL**: Identify the authentic knowledge hierarchy used in the field
3. **STRUCTURE**: Design sub-topics that match real educational progressions
4. **GENERATE**: Create specific, meaningful sub-topics a student would need to master
5. **VALIDATE**: Ensure each sub-topic represents a genuine concept in the field
6. **OUTPUT**: Provide perfect JSON with educationally meaningful nodes

**SUCCESS CRITERIA**:
- Each sub-topic represents a TRUE concept within the domain (as would be found in textbook chapters or course modules)
- Sub-topics follow the ACTUAL knowledge structure used in teaching this subject
- The hierarchy matches how REAL curricula organize this topic
- Each sub-topic represents a SPECIFIC concept requiring its own explanation (not generic categories)
- A student who masters each sub-topic would genuinely understand the parent concept in depth

Create sub-topics that truly match how this topic would be taught in depth at top educational institutions, focusing on the specific concepts students would need to learn to gain comprehensive mastery of the parent topic.`,
          },
          {
            role: "user",
            content: `Apply your advanced cognitive framework to analyze and deeply expand the topic "${nodeTitle}" with true educational depth. 

**ENHANCED CONTEXTUAL INTELLIGENCE INPUTS**:
- Primary Subject Context: ${subjectContext}
- Parent Subject Context: ${parentSubject}
- Focus Topic: "${nodeTitle}"
${nodeDescription ? `- Concept Description: "${nodeDescription}"` : ""}
- Current Depth Level: ${currentLevel || "unknown"}
- Mind Map ID: ${mindMapId || "context-derived"}

**INTELLIGENT CONTEXT ANALYSIS PERFORMED**:
The system has analyzed the mind map context and node title to determine the educational domain. The detected subject context is "${subjectContext}" which should guide ALL sub-topic generation.

**CRITICAL DOMAIN VALIDATION & ENFORCEMENT**:

**STEP 1: INTELLIGENT DOMAIN DETECTION FOR "${nodeTitle}"**
Primary Analysis: Topic "${nodeTitle}" in context "${subjectContext}"

Use your natural language understanding to determine the academic domain. The node title "${nodeTitle}" should give you clear signals about whether this is:
- Computer Science/Programming (algorithms, coding, software engineering, data structures, web development, etc.)
- Biology/Life Sciences (photosynthesis, cell biology, genetics, ecology, evolution, etc.)
- Physics (mechanics, quantum, thermodynamics, electromagnetism, etc.)
- Chemistry (reactions, bonding, organic chemistry, etc.)
- Mathematics (calculus, algebra, geometry, proofs, etc.)
- Other academic disciplines

**STEP 2: DOMAIN LOCK-IN PROTOCOL**
Once you identify the domain, generate ONLY sub-topics within that domain:

🖥️ **IF COMPUTER SCIENCE/PROGRAMMING DOMAIN DETECTED:**
- Generate ONLY CS/programming sub-topics using authentic programming terminology
- Focus on: algorithms, data structures, design patterns, frameworks, languages, software engineering concepts
- Examples: Method Overriding, Function Templates, Dynamic Dispatch, Compile-time Resolution, etc.
- FORBIDDEN: Any biology, chemistry, physics, or non-CS terminology
- NO biology, chemistry, physics, or other domain concepts allowed
- Sub-topics should be recognizable to software engineers and CS students

📚 **IF OTHER DOMAIN DETECTED:**
- Stay strictly within that domain's terminology and concepts
- Use domain-specific educational hierarchies

**STEP 3: QUALITY CHECK**
Before finalizing sub-topics, ask:
- Are ALL sub-topics within the same domain as the parent topic?
- Would a CS professor recognize these as proper CS sub-topics (if CS domain)?
- Do the sub-topics use authentic terminology from the field?
- Are there NO cross-domain contaminations?

**EXAMPLE DOMAIN ADHERENCE:**
- Topic: "Polymorphism" (CS) → Sub-topics: "Method Overriding", "Function Overloading", "Generic Programming", "Virtual Functions"
- Topic: "Algorithms" (CS) → Sub-topics: "Sorting Algorithms", "Search Algorithms", "Graph Algorithms", "Dynamic Programming"
- Topic: "React Components" (Web Dev) → Sub-topics: "Functional Components", "Class Components", "Component Lifecycle", "Props and State"

**EXPANSION MISSION**: 
Create 3-5 educationally meaningful sub-topics that represent TRUE DEEP DIVES into "${nodeTitle}" WITHIN THE SAME DOMAIN. These should NOT be generic categories but specific, advanced concepts that someone studying "${nodeTitle}" would need to master for comprehensive understanding.

**EDUCATIONAL DEPTH REQUIREMENTS**:

1. **DOMAIN-SPECIFIC DEEP HIERARCHICAL PROGRESSION**:
   
   **🖥️ FOR COMPUTER SCIENCE/PROGRAMMING TOPICS EXAMPLES:**
   - **"Polymorphism"** → "Method Overriding", "Function Overloading", "Generic Programming", "Virtual Functions", "Template Specialization"
   - **"Data Structures"** → "Array Implementation", "Linked List Variants", "Tree Balancing", "Hash Collision Resolution", "Graph Representations"
   - **"Algorithms"** → "Divide and Conquer", "Dynamic Programming", "Greedy Strategies", "Backtracking", "Branch and Bound"
   - **"Object-Oriented Programming"** → "Encapsulation Mechanisms", "Inheritance Hierarchies", "Polymorphic Dispatch", "Abstract Classes vs Interfaces"
   - **"Web Development"** → "Client-Side Rendering", "Server-Side Rendering", "API Design", "State Management", "Authentication"
   - **"Machine Learning"** → "Supervised Learning", "Unsupervised Learning", "Feature Engineering", "Model Evaluation", "Neural Network Architectures"
   - **"Database Systems"** → "Query Optimization", "Transaction Management", "Concurrency Control", "Indexing Strategies", "Distributed Databases"
   
   **🧬 FOR BIOLOGY TOPICS (ONLY IF CLEARLY BIOLOGICAL):**
   - **"Photosynthesis"** → "Light-Dependent Reactions", "Calvin Cycle", "Photorespiration", "C4 Pathway"
   - **"Cell Division"** → "Mitotic Phases", "Meiotic Stages", "Chromosome Segregation", "Cytokinesis"
   
   **⚗️ FOR CHEMISTRY TOPICS (ONLY IF CLEARLY CHEMICAL):**
   - **"Chemical Bonding"** → "Ionic Bonding", "Covalent Bonding", "Metallic Bonding", "Intermolecular Forces"
   
   **🔬 FOR PHYSICS TOPICS (ONLY IF CLEARLY PHYSICAL):**
   - **"Quantum Mechanics"** → "Wave-Particle Duality", "Uncertainty Principle", "Quantum Entanglement", "Schrödinger Equation"

2. **ADVANCED CONCEPTUAL SPECIFICITY**:
   - Each sub-topic must represent an ACTUAL PEDAGOGICAL NEXT STEP that would be taught in an advanced course
   - Each must be a precise, recognized concept within the discipline (not made-up or overly generic)
   - Each should be taught in upper-level undergraduate or graduate courses in the field

3. **EDUCATIONAL USEFULNESS**:
   - Sub-topics should follow how REAL TEXTBOOKS and CURRICULA structure the deeper learning of the parent topic
   - Structure should match how instructors would actually teach this material in-depth
   - Sub-topics should follow the natural knowledge prerequisites needed to master the parent concept

4. **DOMAIN-AUTHENTIC EXPANSION**:
   - Use terminology that domain experts would recognize instantly as proper sub-categories
   - Sub-topics should reflect how the concept is actually divided in academic literature
   - Match the classification patterns used in scholarly publications on the subject

**EDUCATIONAL QUALITY CHECKLIST**:
- Would a professor teaching an advanced course on "${nodeTitle}" recognize these as proper sub-topics?
- Are these the SPECIFIC concepts students would need to learn to truly master "${nodeTitle}"?
- Do these follow the natural hierarchical organization found in authoritative textbooks?
- Would these sub-topics be recognizable chapters or sections in a specialized book on "${nodeTitle}"?

**FINAL DOMAIN CONSISTENCY VALIDATION**:
Before generating the JSON response, perform this critical validation:

1. **Domain Consistency Check**: Are ALL sub-topics within the same academic domain as "${nodeTitle}"?
2. **CS Topic Validation**: If this is a Computer Science/Programming topic, do ALL sub-topics use proper CS terminology?
3. **Cross-Domain Contamination Check**: Are there any biology, chemistry, physics terms mixed into a CS topic?
4. **Terminology Authenticity**: Do the sub-topics use terms that appear in actual textbooks for this domain?
5. **Educational Progression**: Do the sub-topics represent natural learning progression within the field?

**CRITICAL REQUIREMENTS**:
- **For CS/Programming topics**: ONLY use programming, software engineering, computer science terminology
- **No domain mixing**: If it's CS, keep it 100% CS. If it's biology, keep it 100% biology
- **Authentic terminology**: Use real terms from the field, not made-up or generic categories
- **Educational value**: Each sub-topic should be a genuine learning objective in the field

Generate sub-topics that represent genuine educational depth - the kind that would appear in specialized textbooks, scholarly articles, and advanced courses. Your expansion should be recognizable to domain experts as the proper way to do a deep dive into "${nodeTitle}" WITHIN ITS SPECIFIC DOMAIN.

**ABSOLUTE RULE: MAINTAIN STRICT DOMAIN BOUNDARIES. NO EXCEPTIONS.**`,
          },
        ],
        model: "gpt-3.5-turbo",
        temperature: 0.02, // Ultra-low for maximum precision and domain consistency
        max_tokens: 3000, // Increased for more comprehensive responses
        top_p: 0.4, // More focused on highest probability tokens
        presence_penalty: -0.5, // Strong favor for consistency in domain terminology
        frequency_penalty: 0.2, // Higher penalty for repetition to ensure diverse coverage
        response_format: { type: "json_object" },
      });

      // Extract the generated content from OpenAI response
      let expansionText =
        completion.choices[0]?.message?.content || '{"subNodes": []}';

      // Clean up the response - remove markdown code blocks if present
      expansionText = expansionText
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();

      // Parse the JSON response
      let expansionResult;
      try {
        expansionResult = JSON.parse(expansionText);

        // Validate the response structure
        if (
          !expansionResult.subNodes ||
          !Array.isArray(expansionResult.subNodes)
        ) {
          throw new Error(
            "Invalid response format - subNodes not found or not an array"
          );
        }

        // Ensure we have valid sub-nodes
        expansionResult.subNodes = expansionResult.subNodes.filter(
          (node) =>
            node.title &&
            node.description &&
            typeof node.title === "string" &&
            typeof node.description === "string"
        );

        if (expansionResult.subNodes.length === 0) {
          throw new Error("No valid sub-nodes generated");
        }
      } catch (parseError) {
        console.error("Failed to parse expansion response:", parseError);
        console.log("Raw response text:", expansionText);
        // Return default expansion nodes on parsing error
        expansionResult = {
          subNodes: [
            {
              title: `${nodeTitle} - Core Concepts`,
              description: `Fundamental concepts and principles of ${nodeTitle} in ${subjectContext}`,
              hasChildren: true,
            },
            {
              title: `${nodeTitle} - Practical Applications`,
              description: `Real-world applications and implementation of ${nodeTitle} within ${subjectContext}`,
              hasChildren: true,
            },
            {
              title: `${nodeTitle} - Advanced Topics`,
              description: `Advanced concepts and deeper understanding of ${nodeTitle} in the context of ${subjectContext}`,
              hasChildren: true,
            },
          ],
        };
      } // Update the mind map in the database with the new expanded nodes
      if (db && mindMapId) {
        try {
          let mindMap = null;
          let updateQuery = {};

          // Determine the correct query based on ID format
          if (ObjectId.isValid(mindMapId)) {
            // Standard MongoDB ObjectId format
            updateQuery = { _id: new ObjectId(mindMapId), userId: userId };
            mindMap = await db.collection("mindmaps").findOne(updateQuery);
          } else {
            // Custom ID format - try different fields
            updateQuery = { mindMapId: mindMapId, userId: userId };
            mindMap = await db.collection("mindmaps").findOne(updateQuery);

            if (!mindMap) {
              updateQuery = { customId: mindMapId, userId: userId };
              mindMap = await db.collection("mindmaps").findOne(updateQuery);
            }
          }

          if (mindMap) {
            // Generate unique IDs for the new sub-nodes
            const newSubNodes = expansionResult.subNodes.map(
              (subNode, index) => ({
                id: `${nodeId}_expanded_${index + 1}`,
                title: subNode.title,
                description: subNode.description,
                hasChildren: subNode.hasChildren !== false, // Default to true unless explicitly false
                parentNode: nodeId,
                level: (currentLevel || 0) + 1,
                isExpanded: false,
                position: { x: 0, y: 0 }, // Will be calculated by frontend
              })
            );

            // Update the mind map document to mark the node as expanded and add the new sub-nodes
            await db.collection("mindmaps").updateOne(updateQuery, {
              $set: {
                [`expandedNodes.${nodeId}`]: {
                  expanded: true,
                  subNodes: newSubNodes,
                  expandedAt: new Date(),
                },
                lastModified: new Date(),
              },
            });

            console.log(
              `Successfully expanded node ${nodeId} with ${newSubNodes.length} sub-nodes`
            );
          } else {
            console.log(
              `Mind map not found for expansion update. ID: ${mindMapId}`
            );
          }
        } catch (dbError) {
          console.error("Error updating mind map in database:", dbError);
          // Continue anyway - the expansion can still work without DB update
        }
      }

      return res.json({
        success: true,
        expandedNodes: expansionResult.subNodes.map((subNode, index) => ({
          id: `${nodeId}_expanded_${index + 1}`,
          title: subNode.title,
          description: subNode.description,
          hasChildren: subNode.hasChildren !== false,
          parentNode: nodeId,
          level: (currentLevel || 0) + 1,
          isExpanded: false,
        })),
      });
    } catch (apiError) {
      console.error("Error calling OpenAI API for node expansion:", apiError);
      // Return default expansion nodes on API error
      const defaultSubNodes = [
        {
          id: `${nodeId}_expanded_1`,
          title: `${nodeTitle} - Core Concepts`,
          description: `Fundamental concepts and principles of ${nodeTitle} in ${subjectContext}`,
          hasChildren: true,
          parentNode: nodeId,
          level: (currentLevel || 0) + 1,
          isExpanded: false,
        },
        {
          id: `${nodeId}_expanded_2`,
          title: `${nodeTitle} - Implementation`,
          description: `Practical implementation and applications of ${nodeTitle} within ${subjectContext}`,
          hasChildren: true,
          parentNode: nodeId,
          level: (currentLevel || 0) + 1,
          isExpanded: false,
        },
        {
          id: `${nodeId}_expanded_3`,
          title: `${nodeTitle} - Advanced Topics`,
          description: `Advanced concepts and deeper understanding of ${nodeTitle} in the context of ${subjectContext}`,
          hasChildren: true,
          parentNode: nodeId,
          level: (currentLevel || 0) + 1,
          isExpanded: false,
        },
      ];

      return res.json({
        success: true,
        expandedNodes: defaultSubNodes,
      });
    }
  } catch (error) {
    console.error("Error expanding mind map node:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to expand node",
      details: error.message,
    });
  }
});

// Mind Map Node Quiz Generator Endpoint - Generates quiz questions for mark-as-read verification
app.post("/api/mindmap/node-quiz", verifyToken, async (req, res) => {
  try {
    const { nodeId, nodeDescription } = req.body;

    if (!nodeId || !nodeDescription) {
      return res.status(400).json({
        success: false,
        error: "Node ID and description are required",
      });
    }

    console.log(`Generating quiz questions for node: ${nodeId}`);
    try {
      // Use OpenAI for quiz generation
      const quizOpenAI = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        maxRetries: 2,
      });

      const completion = await quizOpenAI.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an AI tutor that creates quiz questions to test student understanding of educational content.

You will generate exactly 3 multiple-choice questions to verify that the student has properly understood the material.

Requirements for each question:
1. Should test genuine understanding, not just memorization
2. Should be directly related to the provided content
3. Must have exactly 4 options (A, B, C, D)
4. Only ONE option should be correct
5. Questions should be at an appropriate difficulty level - not too easy, not too hard
6. Avoid trick questions or overly complex wording

IMPORTANT: Return ONLY a valid JSON object in the exact format below. Do not include any markdown formatting, code blocks, or explanations.

Required format:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": {
        "A": "First option",
        "B": "Second option", 
        "C": "Third option",
        "D": "Fourth option"
      },
      "correct": "A",
      "explanation": "Brief explanation of why this answer is correct"
    }
  ]
}

Your response must be valid JSON that can be parsed directly.`,
          },
          {
            role: "user",
            content: `Generate exactly 3 multiple-choice questions based on this educational content about "${nodeId}":

Content:
${nodeDescription}

Create questions that test genuine understanding of the key concepts, with appropriate difficulty level.`,
          },
        ],
        model: "gpt-3.5-turbo",
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });

      // Extract the generated content from OpenAI response
      let quizText =
        completion.choices[0]?.message?.content || '{"questions": []}';

      // Clean up the response - remove markdown code blocks if present
      quizText = quizText
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();

      // Parse the JSON quiz or return default questions if parsing fails
      let quizData;
      try {
        quizData = JSON.parse(quizText);

        // Validate that we got the expected structure
        if (
          !quizData.questions ||
          !Array.isArray(quizData.questions) ||
          quizData.questions.length === 0
        ) {
          throw new Error("Invalid response format - missing questions array");
        }

        // Validate each question has the required structure
        quizData.questions = quizData.questions
          .filter(
            (q) =>
              q.question &&
              q.options &&
              q.correct &&
              typeof q.question === "string" &&
              typeof q.options === "object" &&
              typeof q.correct === "string" &&
              q.options.A &&
              q.options.B &&
              q.options.C &&
              q.options.D
          )
          .slice(0, 3); // Ensure we have at most 3 questions

        if (quizData.questions.length < 3) {
          // Fill with generic questions if we don't have enough
          while (quizData.questions.length < 3) {
            const questionNum = quizData.questions.length + 1;
            quizData.questions.push({
              question: `What is a key concept from this topic that you should remember?`,
              options: {
                A: "I understand the main concepts",
                B: "I need to review more",
                C: "I'm not sure about this topic",
                D: "I haven't read the content carefully",
              },
              correct: "A",
              explanation:
                "Understanding the main concepts is essential for mastering this topic.",
            });
          }
        }
      } catch (parseError) {
        console.error("Failed to parse quiz response:", parseError);
        console.log("Raw response text:", quizText);

        // Return default quiz questions
        quizData = {
          questions: [
            {
              question:
                "Have you carefully read and understood the main concepts of this topic?",
              options: {
                A: "Yes, I understand the core concepts",
                B: "I skimmed through it",
                C: "I haven't read it yet",
                D: "I'm confused about the content",
              },
              correct: "A",
              explanation:
                "Careful reading and understanding is required to mark a topic as complete.",
            },
            {
              question:
                "Can you explain or apply the key ideas from this topic?",
              options: {
                A: "Yes, I can explain and apply the concepts",
                B: "I remember some parts",
                C: "I need to review again",
                D: "I don't understand the concepts",
              },
              correct: "A",
              explanation:
                "Being able to explain and apply concepts shows true understanding.",
            },
            {
              question:
                "Do you feel confident about your knowledge of this topic?",
              options: {
                A: "Yes, I'm confident in my understanding",
                B: "Somewhat confident",
                C: "Not very confident",
                D: "I'm not confident at all",
              },
              correct: "A",
              explanation:
                "Confidence in your understanding indicates you've mastered the topic.",
            },
          ],
        };
      }

      return res.json({
        success: true,
        quiz: quizData,
      });
    } catch (apiError) {
      console.error("Error calling OpenAI API for quiz generation:", apiError);

      // Return default quiz on API error
      return res.json({
        success: true,
        quiz: {
          questions: [
            {
              question:
                "Have you carefully read and understood the main concepts of this topic?",
              options: {
                A: "Yes, I understand the core concepts",
                B: "I skimmed through it",
                C: "I haven't read it yet",
                D: "I'm confused about the content",
              },
              correct: "A",
              explanation:
                "Careful reading and understanding is required to mark a topic as complete.",
            },
            {
              question:
                "Can you explain or apply the key ideas from this topic?",
              options: {
                A: "Yes, I can explain and apply the concepts",
                B: "I remember some parts",
                C: "I need to review again",
                D: "I don't understand the concepts",
              },
              correct: "A",
              explanation:
                "Being able to explain and apply concepts shows true understanding.",
            },
            {
              question:
                "Do you feel confident about your knowledge of this topic?",
              options: {
                A: "Yes, I'm confident in my understanding",
                B: "Somewhat confident",
                C: "Not very confident",
                D: "I'm not confident at all",
              },
              correct: "A",
              explanation:
                "Confidence in your understanding indicates you've mastered the topic.",
            },
          ],
        },
      });
    }
  } catch (error) {
    console.error("Error generating node quiz:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate quiz",
      details: error.message,
    });
  }
});

// Global error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    details: err.message,
  });
});

// Keep-alive mechanism to prevent Render from sleeping
const keepAlive = () => {
  const url = process.env.BACKEND_URL || `http://localhost:${PORT}`;

  // Only ping if we have a production URL
  if (process.env.BACKEND_URL) {
    setInterval(async () => {
      try {
        const response = await fetch(`${url}/health`);
        if (response.ok) {
          console.log(
            `Keep-alive ping successful at ${new Date().toISOString()}`
          );
        } else {
          console.log(`Keep-alive ping failed with status: ${response.status}`);
        }
      } catch (error) {
        console.log(`Keep-alive ping error: ${error.message}`);
      }
    }, 14 * 60 * 1000); // Ping every 14 minutes (Render sleeps after 15 minutes of inactivity)
  }
};

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Start keep-alive pings after server is running
  keepAlive();
});
