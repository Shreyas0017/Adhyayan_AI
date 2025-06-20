import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;

    // Get room from Firebase
    const roomRef = doc(db, 'quiz-rooms', roomCode);
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    const room = roomSnap.data();

    if (room.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Room is not in waiting state' },
        { status: 400 }
      );
    }

    if (room.participants.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 participants to start' },
        { status: 400 }
      );
    }

    if (!room.questions || room.questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions available' },
        { status: 400 }
      );
    }

    // Start the quiz
    await updateDoc(roomRef, {
      status: 'active',
      questionStartTime: new Date(),
      currentQuestionIndex: 0,
      participantAnswers: {} // Initialize answer tracking
    });

    return NextResponse.json({
      message: 'Quiz started successfully',
      success: true
    });
    
  } catch (error) {
    console.error('Error starting quiz:', error);
    return NextResponse.json(
      { error: 'Failed to start quiz' },
      { status: 500 }
    );
  }
}