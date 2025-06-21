import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';
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
      
      // Check if user is in the room
      const participantIndex = room.participants.findIndex((p: any) => p.userId === userId);
      if (participantIndex === -1) {
        throw new Error('User not found in room');
      }

      const participant = room.participants[participantIndex];
      
      // Check extension limits
      const maxExtensions = 3; // Maximum 3 extensions per participant
      const extensionDuration = 10 * 60 * 1000; // 10 minutes in milliseconds
      const currentExtensions = participant.timeExtensions || 0;

      if (currentExtensions >= maxExtensions) {
        throw new Error(`Maximum extensions reached (${maxExtensions}). Cannot extend room timeout further.`);
      }

      // Calculate new timeout
      const now = new Date();
      const currentTimeout = room.autoDeleteAt ? new Date(room.autoDeleteAt) : new Date(now.getTime() + 5 * 60 * 1000);
      const newTimeout = new Date(Math.max(currentTimeout.getTime(), now.getTime()) + extensionDuration);

      // Update participant's extension count
      const updatedParticipants = [...room.participants];
      updatedParticipants[participantIndex] = {
        ...participant,
        timeExtensions: currentExtensions + 1,
        lastExtensionAt: now
      };

      // Update room with new timeout and participant data
      transaction.update(roomRef, {
        participants: updatedParticipants,
        autoDeleteAt: newTimeout,
        lastActivity: now,
        extensionHistory: [
          ...(room.extensionHistory || []),
          {
            userId,
            userName: participant.userName,
            extendedAt: now,
            extensionNumber: currentExtensions + 1,
            newTimeout: newTimeout
          }
        ]
      });

      return {
        success: true,
        newTimeout: newTimeout,
        extensionsRemaining: maxExtensions - (currentExtensions + 1),
        extensionDuration: extensionDuration / (60 * 1000) // in minutes
      };
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error extending room timeout:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extend room timeout' },
      { status: 500 }
    );
  }
}
