import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
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
    
    // Update participant's last activity if userId is provided
    if (userId) {
      const participantIndex = room.participants.findIndex((p: any) => p.userId === userId);
      if (participantIndex !== -1) {
        const now = new Date();
        const updatedParticipants = [...room.participants];
        updatedParticipants[participantIndex] = {
          ...updatedParticipants[participantIndex],
          lastActivity: now
        };

        // Extend auto-delete timeout if there's activity and room is not in active quiz
        let updateData: any = {
          participants: updatedParticipants,
          lastActivity: now
        };

        // Only extend timeout for waiting rooms or if current timeout is soon
        if (room.status === 'waiting' || (room.autoDeleteAt && new Date(room.autoDeleteAt).getTime() - now.getTime() < 2 * 60 * 1000)) {
          // Extend by 5 minutes from now, but don't exceed 30 minutes total from creation
          const createdAt = room.createdAt?.toDate ? room.createdAt.toDate() : new Date(room.createdAt || now);
          const maxTimeout = new Date(createdAt.getTime() + 30 * 60 * 1000); // 30 minutes from creation
          const proposedTimeout = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
          
          updateData.autoDeleteAt = proposedTimeout.getTime() < maxTimeout.getTime() ? proposedTimeout : maxTimeout;
        }

        // Update the room with new activity timestamp
        await updateDoc(roomRef, updateData);

        // Update local room data for response
        room.participants = updatedParticipants;
        room.lastActivity = now;
        if (updateData.autoDeleteAt) {
          room.autoDeleteAt = updateData.autoDeleteAt;
        }
      }
    }

    // Check for inactive participants (disconnected for more than 2 minutes)
    const now = new Date();
    const activeParticipants = room.participants.filter((p: any) => {
      const lastActivity = p.lastActivity?.toDate ? p.lastActivity.toDate() : new Date(p.lastActivity || now);
      const timeDiff = now.getTime() - lastActivity.getTime();
      return timeDiff < 2 * 60 * 1000; // 2 minutes threshold
    });

    // If participants have been removed due to inactivity, update the room
    if (activeParticipants.length !== room.participants.length) {
      if (activeParticipants.length === 0) {
        // No active participants, delete the room
        await deleteDoc(roomRef);
        return NextResponse.json(
          { error: 'Room deleted due to inactivity' },
          { status: 404 }
        );
      } else {
        // Update room with only active participants
        let newHostId = room.hostId;
        const hostStillActive = activeParticipants.some((p: any) => p.userId === room.hostId);
        
        if (!hostStillActive && activeParticipants.length > 0) {
          newHostId = activeParticipants[0].userId;
        }

        await updateDoc(roomRef, {
          participants: activeParticipants,
          hostId: newHostId,
          lastActivity: new Date()
        });

        // Update local room data for response
        room.participants = activeParticipants;
        room.hostId = newHostId;
      }
    }
    
    // Find the current user's participant data
    const currentParticipant = userId ? room.participants.find((p: any) => p.userId === userId) : null;
    
    // Return room state
    const response: any = {
      room,
      participants: room.participants,
      currentParticipant,
      autoDeleteAt: room.autoDeleteAt,
      timeUntilDeletion: room.autoDeleteAt ? Math.max(0, new Date(room.autoDeleteAt).getTime() - new Date().getTime()) : null
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