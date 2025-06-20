import { NextRequest, NextResponse } from 'next/server';

// Mock types for now - replace with your actual types
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  timeLimit: number;
}

interface Participant {
  userId: string;
  userName: string;
  joinedAt: Date;
  score: number;
  correctAnswers: number;
  averageResponseTime: number;
  isReady: boolean;
}

interface Room {
  roomCode: string;
  roomName: string;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  hostId: string;
  hostName: string;
  maxParticipants: number;
  entryFee: number;
  prizePool: number;
  status: 'waiting' | 'active' | 'completed';
  questions: QuizQuestion[];
  participants: Participant[];
  currentQuestionIndex: number;
  createdAt: Date;
  settings: {
    questionCount: number;
    timePerQuestion: number;
    showExplanations: boolean;
  };
}

// In-memory storage
const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateMockQuestions(count: number, difficulty: string, subject: string, topic: string): QuizQuestion[] {
  const timeLimit = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 25 : 20;
  
  const mockQuestions: QuizQuestion[] = [];
  for (let i = 0; i < count; i++) {
    mockQuestions.push({
      id: `q_${Date.now()}_${i}`,
      question: `${subject} Question ${i + 1}: What is a fundamental concept in ${topic}?`,
      options: [
        `Option A for ${topic}`,
        `Option B for ${topic}`,
        `Option C for ${topic}`,
        `Option D for ${topic}`
      ],
      correctAnswer: Math.floor(Math.random() * 4),
      explanation: `This is the explanation for question ${i + 1} about ${topic} in ${subject}.`,
      timeLimit
    });
  }
  
  return mockQuestions;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== API Route Called ===');
    console.log('Method:', request.method);
    console.log('URL:', request.url);

    const body = await request.json();
    console.log('Request body:', body);
    
    const {
      roomName,
      subject,
      topic,
      difficulty,
      questionCount,
      maxParticipants,
      hostId,
      hostName
    } = body;

    // Validate required fields
    if (!roomName || !subject || !topic || !hostId || !hostName) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate difficulty
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      console.log('Invalid difficulty:', difficulty);
      return NextResponse.json(
        { error: 'Invalid difficulty level' },
        { status: 400 }
      );
    }

    // Validate question count
    if (questionCount < 5 || questionCount > 20) {
      console.log('Invalid question count:', questionCount);
      return NextResponse.json(
        { error: 'Question count must be between 5 and 20' },
        { status: 400 }
      );
    }

    // Generate room code
    const roomCode = generateRoomCode();
    console.log('Generated room code:', roomCode);

    // Generate mock questions
    const questions = generateMockQuestions(questionCount, difficulty, subject, topic);
    console.log('Generated questions:', questions.length);

    // Create host participant
    const hostParticipant: Participant = {
      userId: hostId,
      userName: hostName,
      joinedAt: new Date(),
      score: 0,
      correctAnswers: 0,
      averageResponseTime: 0,
      isReady: true
    };

    // Create room
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
      prizePool: 5,
      status: 'waiting',
      questions,
      participants: [hostParticipant],
      currentQuestionIndex: 0,
      createdAt: new Date(),
      settings: {
        questionCount,
        timePerQuestion: difficulty === 'easy' ? 30 : difficulty === 'medium' ? 25 : 20,
        showExplanations: true
      }
    };

    // Store room
    rooms.set(roomCode, room);
    console.log('Room stored successfully');
    console.log('Total rooms in storage:', rooms.size);

    const response = {
      roomCode,
      message: 'Room created successfully'
    };

    console.log('Sending response:', response);

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('=== API Error ===');
    console.error('Error creating room:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { error: 'Failed to create room. Please try again.' },
      { status: 500 }
    );
  }
}

// Add GET method for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'Room creation API is working',
    totalRooms: rooms.size,
    timestamp: new Date().toISOString()
  });
}