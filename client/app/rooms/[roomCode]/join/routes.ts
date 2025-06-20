import { NextRequest, NextResponse } from 'next/server';
import { addParticipant } from '@/lib/room-storage';
import { Participant } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomCode: string } }
) {
  try {
    const { roomCode } = params;
    const body = await request.json();
    
    const { userId, userName } = body;
    
    if (!userId || !userName) {
      return NextResponse.json(
        { error: 'User ID and name are required' },
        { status: 400 }
      );
    }

    const participant: Participant = {
      userId,
      userName,
      joinedAt: new Date(),
      score: 0,
      correctAnswers: 0,
      averageResponseTime: 0,
      isReady: false
    };

    const updatedRoom = await addParticipant(roomCode, participant);
    
    if (!updatedRoom) {
      return NextResponse.json(
        { error: 'Failed to join room' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Successfully joined room',
      room: updatedRoom
    });
    
  } catch (error) {
    console.error('Error joining room:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Room is full') {
        return NextResponse.json(
          { error: 'Room is full' },
          { status: 400 }
        );
      }
      if (error.message === 'Room not found') {
        return NextResponse.json(
          { error: 'Room not found' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to join room' },
      { status: 500 }
    );
  }
}