import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting room cleanup job...');
    
    const roomsRef = collection(db, 'quiz-rooms');
    const now = new Date();
    let deletedCount = 0;

    // Get all rooms
    const allRoomsQuery = query(roomsRef);
    const allRoomsSnapshot = await getDocs(allRoomsQuery);

    const roomsToDelete: string[] = [];

    allRoomsSnapshot.forEach((roomDoc) => {
      const room = roomDoc.data();
      const roomCode = roomDoc.id;
      
      // Delete completed rooms that are older than 1 hour
      if (room.status === 'completed') {
        const completedAt = room.results?.completedAt?.toDate ? room.results.completedAt.toDate() : new Date(room.results?.completedAt || now);
        const hoursSinceCompletion = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceCompletion > 1) {
          roomsToDelete.push(roomCode);
          return;
        }
      }

      // Delete rooms with no participants
      if (!room.participants || room.participants.length === 0) {
        roomsToDelete.push(roomCode);
        return;
      }

      // Delete rooms that have passed their auto-delete timeout
      if (room.autoDeleteAt) {
        const autoDeleteTime = room.autoDeleteAt.toDate ? room.autoDeleteAt.toDate() : new Date(room.autoDeleteAt);
        if (now.getTime() > autoDeleteTime.getTime()) {
          roomsToDelete.push(roomCode);
          console.log(`Room ${roomCode} marked for deletion due to timeout (${autoDeleteTime})`);
          return;
        }
      }

      // Delete rooms where all participants have been inactive for more than 5 minutes (fallback)
      const allInactive = room.participants.every((participant: any) => {
        const lastActivity = participant.lastActivity?.toDate ? participant.lastActivity.toDate() : new Date(participant.lastActivity || now);
        const minutesSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
        return minutesSinceActivity > 5;
      });

      if (allInactive) {
        roomsToDelete.push(roomCode);
        return;
      }

      // Delete rooms that have been waiting for more than 30 minutes
      if (room.status === 'waiting') {
        const createdAt = room.createdAt?.toDate ? room.createdAt.toDate() : new Date(room.createdAt || now);
        const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);
        
        if (minutesSinceCreation > 30) {
          roomsToDelete.push(roomCode);
          return;
        }
      }
    });

    // Delete the identified rooms
    for (const roomCode of roomsToDelete) {
      try {
        await deleteDoc(doc(db, 'quiz-rooms', roomCode));
        deletedCount++;
        console.log(`Deleted room: ${roomCode}`);
      } catch (error) {
        console.error(`Failed to delete room ${roomCode}:`, error);
      }
    }

    console.log(`Cleanup job completed. Deleted ${deletedCount} rooms.`);

    return NextResponse.json({
      success: true,
      deletedCount,
      totalRoomsChecked: allRoomsSnapshot.size,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Error in room cleanup job:', error);
    return NextResponse.json(
      { error: 'Failed to run cleanup job' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Room cleanup API is available. Use POST to run cleanup.',
    timestamp: new Date().toISOString()
  });
}
