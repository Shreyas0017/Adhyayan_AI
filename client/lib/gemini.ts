import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface QuestionGenerationParams {
  subject: string;
  topic: string;
  difficulty: string;
  questionCount: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export async function generateQuizQuestions(params: QuestionGenerationParams): Promise<QuizQuestion[]> {
  try {
    console.log('Generating questions with params:', params);
    
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Generate exactly ${params.questionCount} competitive quiz questions about "${params.topic}" in the subject of "${params.subject}" with ${params.difficulty} difficulty level.

Requirements:
- Each question should be challenging and suitable for competitive quiz
- Provide exactly 4 multiple choice options for each question
- Include a detailed explanation for the correct answer
- Questions should test deep understanding, not just memorization
- Vary question types (factual, analytical, application-based)
- Make sure questions are unique and non-repetitive

Format your response as a valid JSON array with this exact structure:
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Detailed explanation of why this answer is correct"
  }
]

Subject: ${params.subject}
Topic: ${params.topic}
Difficulty: ${params.difficulty}
Count: ${params.questionCount}

Return ONLY the JSON array, no additional text or formatting.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Raw Gemini response:', text.substring(0, 200) + '...');

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
    
    // Add unique IDs and validate structure
    const processedQuestions = questions.map((q: any, index: number) => ({
      id: `q_${Date.now()}_${index}`,
      question: q.question,
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      explanation: q.explanation || 'No explanation provided'
    }));

    // Validate that we have the correct number of questions
    if (processedQuestions.length !== params.questionCount) {
      console.warn(`Expected ${params.questionCount} questions, got ${processedQuestions.length}`);
    }

    // Validate each question has 4 options
    interface ProcessedQuestion extends QuizQuestion {}

    processedQuestions.forEach((q: ProcessedQuestion, index: number) => {
      if (!q.options || q.options.length !== 4) {
      console.warn(`Question ${index + 1} doesn't have exactly 4 options`);
      }
      if (q.correctAnswer < 0 || q.correctAnswer > 3) {
      console.warn(`Question ${index + 1} has invalid correct answer index`);
      q.correctAnswer = 0; // Default to first option
      }
    });

    console.log('Generated and processed questions:', processedQuestions.length);
    return processedQuestions;

  } catch (error) {
    console.error('Error generating questions with Gemini:', error);
    
    // Return fallback questions if AI generation fails
    return generateFallbackQuestions(params);
  }
}

function generateFallbackQuestions(params: QuestionGenerationParams): QuizQuestion[] {
  console.log('Generating fallback questions for:', params.subject, params.topic);
  
  const fallbackQuestions: QuizQuestion[] = [];
  
  for (let i = 0; i < params.questionCount; i++) {
    fallbackQuestions.push({
      id: `fallback_${Date.now()}_${i}`,
      question: `Sample question ${i + 1} about ${params.topic} in ${params.subject}`,
      options: [
        'Option A',
        'Option B', 
        'Option C',
        'Option D'
      ],
      correctAnswer: 0,
      explanation: 'This is a fallback question generated when AI service is unavailable.'
    });
  }
  
  return fallbackQuestions;
}

export async function validateAnswer(question: QuizQuestion, selectedAnswer: number): Promise<{
  isCorrect: boolean;
  explanation: string;
  score: number;
}> {
  const isCorrect = selectedAnswer === question.correctAnswer;
  return {
    isCorrect,
    explanation: question.explanation,
    score: isCorrect ? 100 : 0
  };
}