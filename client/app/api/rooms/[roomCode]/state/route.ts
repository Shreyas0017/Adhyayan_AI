import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

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
    
    // Find the current user's participant data
    const currentParticipant = userId ? room.participants.find((p: any) => p.userId === userId) : null;
    
    // Return room state
    const response: any = {
      room,
      participants: room.participants,
      currentParticipant
    };

    // If quiz is active and user hasn't finished, send their current question
    if (room.status === 'active' && currentParticipant && !currentParticipant.isFinished) {
      const questionIndex = currentParticipant.currentQuestionIndex;
      const currentQuestion = room.questions[questionIndex];
      
      if (currentQuestion) {
        response.currentQuestion = {
          id: currentQuestion.id,
          question: currentQuestion.question,
          options: currentQuestion.options,
          questionNumber: questionIndex + 1,
          totalQuestions: room.questions.length,
          // Include explanation only after the question is answered
          ...(room.participantAnswers && room.participantAnswers[`${userId}_${questionIndex}`] && {
            correctAnswer: currentQuestion.correctAnswer,
            explanation: currentQuestion.explanation
          })
        };
      }
    }

    if (room.status === 'completed' && room.results) {
      response.results = room.results;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error getting room state:', error);
    return NextResponse.json(
      { error: 'Failed to get room state' },
      { status: 500 }
    );
  }
}