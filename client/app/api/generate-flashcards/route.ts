import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(request: NextRequest) {
  try {
    const { topic, count } = await request.json()

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 })
    }

    // Validate count
    const numCards = Math.max(15, Math.min(Number(count) || 15, 25))

    // Check if API key exists
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY environment variable is not set")
      return NextResponse.json(
        {
          error: "Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.",
        },
        { status: 500 },
      )
    }

    console.log("Generating flashcards for topic:", topic)

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    // Use gemini-1.5-flash for free tier - it's faster and more efficient
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    })

    const prompt = `Create ${numCards} educational flashcards about "${topic}". 
    Return ONLY a valid JSON array with no additional text, markdown, or formatting.
    Each flashcard should have a "question" and "answer" field.
    Make questions clear and concise (max 15 words). 
    Make answers as detailed and informative as necessary to fully explain the concept, without unnecessary length.
    Example format:
    [{"question":"What is photosynthesis?","answer":"The process by which plants convert sunlight, carbon dioxide, and water into glucose and oxygen using chlorophyll."}]
    
    Topic: ${topic}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    console.log("Raw API response:", text)

    // Clean and parse the response
    let flashcardsData
    try {
      // Remove any markdown formatting or extra text
      let cleanText = text.trim()

      // Remove markdown code blocks if present
      cleanText = cleanText.replace(/```json\n?/g, "").replace(/```\n?/g, "")

      // Remove any text before the first [ and after the last ]
      const startIndex = cleanText.indexOf("[")
      const endIndex = cleanText.lastIndexOf("]")

      if (startIndex !== -1 && endIndex !== -1) {
        cleanText = cleanText.substring(startIndex, endIndex + 1)
      }

      flashcardsData = JSON.parse(cleanText)

      // Validate the structure
      if (!Array.isArray(flashcardsData)) {
        throw new Error("Response is not an array")
      }

      // Validate each flashcard has required fields
      flashcardsData.forEach((card, index) => {
        if (!card.question || !card.answer) {
          throw new Error(`Flashcard ${index} missing question or answer`)
        }
      })
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError)
      console.error("Text that failed to parse:", text)

      // Fallback: create sample flashcards if parsing fails
      flashcardsData = [
        {
          question: `What is ${topic}?`,
          answer: `${topic} is an important subject that involves key concepts and principles worth studying.`,
        },
        {
          question: `Why is ${topic} important?`,
          answer: `Understanding ${topic} helps build knowledge and skills in this area of study.`,
        },
        {
          question: `What are the main aspects of ${topic}?`,
          answer: `${topic} includes fundamental concepts, practical applications, and theoretical foundations.`,
        },
        {
          question: `How can you learn ${topic} effectively?`,
          answer: `Study the basics first, practice regularly, and apply concepts through examples and exercises.`,
        },
      ]
    }

    // Add unique IDs to each flashcard
    const flashcards = flashcardsData.map((card: any, index: number) => ({
      id: `card-${Date.now()}-${index}`,
      question: card.question,
      answer: card.answer,
    }))

    console.log("Successfully generated", flashcards.length, "flashcards")
    return NextResponse.json({ flashcards })
  } catch (error) {
    console.error("Error in generate-flashcards API:", error)

    // Handle rate limiting specifically
    if (error instanceof Error && error.message.includes("429")) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait a moment and try again. The free tier has usage limits.",
        },
        { status: 429 },
      )
    }

    // Return more specific error information
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: `Failed to generate flashcards: ${error.message}`,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: "An unexpected error occurred while generating flashcards",
      },
      { status: 500 },
    )
  }
}