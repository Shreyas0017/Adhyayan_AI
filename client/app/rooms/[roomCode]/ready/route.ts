import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoom } from '@/lib/room-storage';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomCode: string } }
) {
  try {
    const { roomCode } = params;
    const body = await request.json();
    
    const { userId, isReady } = body;
    
    if (!userId || typeof isReady !== 'boolean') {
      return NextResponse.json(
        { error: 'User ID and ready status are required' },
        { status: 400 }
      );
    }

    const room = await getRoom(roomCode);
    
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Update participant ready status
    const updatedParticipants = room.participants.map(p => 
      p.userId === userId ? { ...p, isReady } : p
    );

    const updatedRoom = await updateRoom(roomCode, {
      participants: updatedParticipants
    });

    return NextResponse.json({
      message: 'Ready status updated successfully',
      room: updatedRoom
    });
    
  } catch (error) {
    console.error('Error updating ready status:', error);
    return NextResponse.json(
      { error: 'Failed to update ready status' },
      { status: 500 }
    );
  }
}