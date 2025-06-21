import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const { userId, userName } = await request.json();

    if (!userId || !userName) {
      return NextResponse.json(
        { error: 'Missing userId or userName' },
        { status: 400 }
      );
    }

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

    // Check if room is still accepting participants
    if (room.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Room is no longer accepting participants' },
        { status: 400 }
      );
    }

    // Check if user is already in the room
    const existingParticipant = room.participants.find((p: any) => p.userId === userId);
    if (existingParticipant) {
      return NextResponse.json(
        { error: 'You are already in this room' },
        { status: 400 }
      );
    }

    // Check if room is full
    if (room.participants.length >= room.maxParticipants) {
      return NextResponse.json(
        { error: 'Room is full' },
        { status: 400 }
      );
    }

    // Create new participant
    const newParticipant = {
      userId,
      userName,
      joinedAt: new Date(),
      lastActivity: new Date(),
      score: 0,
      correctAnswers: 0,
      averageResponseTime: 0,
      isReady: false,
      currentQuestionIndex: 0,
      isFinished: false,
      timeExtensions: 0
    };

    // Add participant to room and update prize pool
    await updateDoc(roomRef, {
      participants: arrayUnion(newParticipant),
      prizePool: room.prizePool + room.entryFee
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the room',
      room: {
        ...room,
        participants: [...room.participants, newParticipant],
        prizePool: room.prizePool + room.entryFee
      }
    });

  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json(
      { error: 'Failed to join room' },
      { status: 500 }
    );
  }
}