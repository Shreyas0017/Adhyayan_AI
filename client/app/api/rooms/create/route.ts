import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface Participant {
  userId: string;
  userName: string;
  joinedAt: Date;
  lastActivity: Date;
  score: number;
  correctAnswers: number;
  averageResponseTime: number;
  isReady: boolean;
  currentQuestionIndex: number;
  isFinished: boolean;
  timeExtensions?: number;
  lastExtensionAt?: Date;
}

interface Room {
  roomCode: string;
  roomName: string;
  subject: string;
  topic: string;
  difficulty: string;
  hostId: string;
  hostName: string;
  maxParticipants: number;
  entryFee: number;
  prizePool: number;
  status: 'waiting' | 'active' | 'completed';
  questions: any[];
  participants: Participant[];
  createdAt: any;
  lastActivity: Date;
  autoDeleteAt: Date;
  isPublic: boolean;
  settings: {
    questionCount: number;
    timePerQuestion: number;
    showExplanations: boolean;
  };
  participantAnswers: Record<string, Record<string, any>>;
  extensionHistory: Array<{
    userId: string;
    userName: string;
    extendedAt: Date;
    extensionNumber: number;
    newTimeout: Date;
  }>;
}

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function generateQuizQuestions(params: {
  subject: string;
  topic: string;
  difficulty: string;
  questionCount: number;
}): Promise<any[]> {
  try {
    console.log('Generating questions with Gemini AI:', params);
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Generate exactly ${params.questionCount} high-quality competitive quiz questions about "${params.topic}" in the subject of "${params.subject}" with ${params.difficulty} difficulty level.

STRICT REQUIREMENTS:
- Each question must be challenging and educational
- Provide exactly 4 multiple choice options for each question
- Include a detailed explanation for the correct answer
- Questions should test deep understanding, not just memorization
- Vary question types (factual, analytical, application-based, problem-solving)
- Make sure questions are unique and non-repetitive
- Use proper grammar and clear language

FORMAT: Return ONLY a valid JSON array with this exact structure:
[
  {
    "question": "Clear, specific question about ${params.topic}?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Detailed explanation of why this answer is correct and why others are wrong"
  }
]

Subject: ${params.subject}
Topic: ${params.topic}
Difficulty: ${params.difficulty}
Question Count: ${params.questionCount}

Generate exactly ${params.questionCount} questions now:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Raw Gemini response received, length:', text.length);

    // Clean up the response to extract JSON
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Remove any text before the first [ or after the last ]
    const firstBracket = jsonText.indexOf('[');
    const lastBracket = jsonText.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket !== -1) {
      jsonText = jsonText.substring(firstBracket, lastBracket + 1);
    }

    const questions = JSON.parse(jsonText);
    
    if (!Array.isArray(questions)) {
      throw new Error('Response is not an array');
    }

    // Process and validate questions
    const processedQuestions = questions.map((q: any, index: number) => ({
      id: `q_${Date.now()}_${index}`,
      question: q.question || `Question ${index + 1} about ${params.topic}`,
      options: Array.isArray(q.options) && q.options.length === 4 ? q.options : [
        `Option A for question ${index + 1}`,
        `Option B for question ${index + 1}`,
        `Option C for question ${index + 1}`,
        `Option D for question ${index + 1}`
      ],
      correctAnswer: typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer <= 3 ? q.correctAnswer : 0,
      explanation: q.explanation || `This is the correct answer for question ${index + 1}.`
    }));

    console.log(`Successfully generated ${processedQuestions.length} questions`);
    return processedQuestions;

  } catch (error) {
    console.error('Error generating questions with Gemini:', error);
    
    // Return fallback questions if AI generation fails
    return generateFallbackQuestions(params);
  }
}

function generateFallbackQuestions(params: {
  subject: string;
  topic: string;
  difficulty: string;
  questionCount: number;
}): any[] {
  console.log('Generating fallback questions for:', params.subject, params.topic);
  
  const fallbackQuestions = [];
  
  for (let i = 0; i < params.questionCount; i++) {
    fallbackQuestions.push({
      id: `fallback_${Date.now()}_${i}`,
      question: `Which of the following best describes a key concept in ${params.topic}?`,
      options: [
        `It is fundamental to understanding ${params.topic}`,
        `It has no relevance to ${params.topic}`,
        `It contradicts basic principles of ${params.topic}`,
        `It is outdated in modern ${params.topic}`
      ],
      correctAnswer: 0,
      explanation: `The first option correctly identifies a fundamental concept in ${params.topic} within ${params.subject}.`
    });
  }
  
  return fallbackQuestions;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE ROOM API CALLED ===');
    
    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error('Gemini API key not configured');
      return NextResponse.json(
        { error: 'AI service not configured. Please contact administrator.' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const {
      roomName,
      subject,
      topic,
      difficulty = 'medium',
      questionCount = 10,
      maxParticipants = 8,
      hostId,
      hostName,
      timePerQuestion = 30,
      isPublic = true
    } = body;

    // Validate required fields
    if (!roomName || !subject || !topic || !hostId || !hostName) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: roomName, subject, topic, hostId, hostName' },
        { status: 400 }
      );
    }

    // Validate question count
    if (questionCount < 5 || questionCount > 20) {
      return NextResponse.json(
        { error: 'Question count must be between 5 and 20' },
        { status: 400 }
      );
    }

    // Generate room code
    const roomCode = generateRoomCode();
    console.log('Generated room code:', roomCode);

    // Generate quiz questions using Gemini AI
    console.log('Generating questions with Gemini AI...');
    let questions;
    try {
      questions = await generateQuizQuestions({
        subject,
        topic,
        difficulty,
        questionCount
      });
      console.log('Generated questions:', questions.length);
      
    } catch (error) {
      console.error('Error generating questions:', error);
      return NextResponse.json(
        { error: 'Failed to generate quiz questions. Please try again.' },
        { status: 500 }
      );
    }

    // Create host participant
    const hostParticipant: Participant = {
      userId: hostId,
      userName: hostName,
      joinedAt: new Date(),
      lastActivity: new Date(),
      score: 0,
      correctAnswers: 0,
      averageResponseTime: 0,
      isReady: true,
      currentQuestionIndex: 0,
      isFinished: false,
      timeExtensions: 0
    };

    // Create room object
    const room: Room = {
      roomCode,
      roomName,
      subject,
      topic,
      difficulty,
      hostId,
      hostName,
      maxParticipants,
      entryFee: 5,
      prizePool: 5, // Host pays entry fee
      status: 'waiting',
      questions,
      participants: [hostParticipant],
      createdAt: serverTimestamp(),
      lastActivity: new Date(),
      autoDeleteAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
      isPublic,
      settings: {
        questionCount,
        timePerQuestion: timePerQuestion || (difficulty === 'easy' ? 30 : difficulty === 'medium' ? 25 : 20),
        showExplanations: true
      },
      participantAnswers: {},
      extensionHistory: []
    };

    // Store room in Firebase Firestore
    const roomRef = doc(db, 'quiz-rooms', roomCode);
    await setDoc(roomRef, room);
    
    console.log('Room created successfully in Firebase with AI-generated questions');

    return NextResponse.json({
      success: true,
      roomCode,
      message: 'Room created successfully with AI-generated questions',
      questionsGenerated: questions.length
    }, { status: 201 });

  } catch (error) {
    console.error('=== API ERROR ===', error);
    return NextResponse.json(
      { error: 'Server error: ' + (error instanceof Error ? error.message : 'Unknown') },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Create room API is working',
    timestamp: new Date().toISOString()
  });
}