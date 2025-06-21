import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Use a transaction to ensure data consistency
    const result = await runTransaction(db, async (transaction) => {
      const roomRef = doc(db, 'quiz-rooms', roomCode);
      const roomSnap = await transaction.get(roomRef);

      if (!roomSnap.exists()) {
        throw new Error('Room not found');
      }

      const room = roomSnap.data();
      
      // Remove the participant from the room
      const updatedParticipants = room.participants.filter((p: any) => p.userId !== userId);
      
      // If no participants left or room is completed, delete the room
      if (updatedParticipants.length === 0 || room.status === 'completed') {
        transaction.delete(roomRef);
        return { roomDeleted: true, participantsLeft: 0 };
      }

      // If the leaving user was the host, assign a new host
      let updatedHostId = room.hostId;
      if (room.hostId === userId && updatedParticipants.length > 0) {
        updatedHostId = updatedParticipants[0].userId;
      }

      // Update the room with remaining participants
      transaction.update(roomRef, {
        participants: updatedParticipants,
        hostId: updatedHostId,
        lastActivity: new Date()
      });

      return { 
        roomDeleted: false, 
        participantsLeft: updatedParticipants.length,
        newHostId: updatedHostId !== room.hostId ? updatedHostId : null
      };
    });

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error leaving room:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to leave room' },
      { status: 500 }
    );
  }
}
