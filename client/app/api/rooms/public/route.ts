import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    console.log('Fetching public rooms...');
    
    // For now, let's try a simpler query without compound conditions
    const roomsRef = collection(db, 'quiz-rooms');
    
    // Simple query for waiting rooms only
    const q = query(
      roomsRef,
      where('status', '==', 'waiting'),
      limit(50)
    );

    const querySnapshot = await getDocs(q);
    const publicRooms: any[] = [];

    querySnapshot.forEach((doc) => {
      const roomData = doc.data();
      console.log('Room data:', {
        roomCode: roomData.roomCode,
        isPublic: roomData.isPublic,
        status: roomData.status,
        participantCount: roomData.participants?.length || 0,
        maxParticipants: roomData.maxParticipants
      });
      
      // Check if participants are active (within last 5 minutes)
      const now = new Date();
      const activeParticipants = roomData.participants?.filter((participant: any) => {
        const lastActivity = participant.lastActivity?.toDate ? participant.lastActivity.toDate() : new Date(participant.lastActivity || now);
        const minutesSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
        return minutesSinceActivity <= 5; // 5 minutes threshold
      }) || [];
      
      // Filter for public rooms that aren't full and have active participants
      if (roomData.isPublic === true && 
          activeParticipants.length > 0 &&
          activeParticipants.length < roomData.maxParticipants) {
        publicRooms.push({
          roomCode: roomData.roomCode,
          roomName: roomData.roomName || 'Untitled Room',
          subject: roomData.subject || 'General',
          topic: roomData.topic || 'Mixed Topics',
          difficulty: roomData.difficulty || 'medium',
          hostName: roomData.hostName || 'Anonymous Host',
          participantCount: activeParticipants.length,
          maxParticipants: roomData.maxParticipants || 8,
          createdAt: roomData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          settings: {
            questionCount: roomData.settings?.questionCount || 10,
            timePerQuestion: roomData.settings?.timePerQuestion || 30
          }
        });
      }
    });

    // Sort by creation time (newest first) and limit to 20
    const sortedRooms = publicRooms
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    console.log(`Found ${sortedRooms.length} public rooms out of ${querySnapshot.size} total waiting rooms`);

    return NextResponse.json({
      success: true,
      rooms: sortedRooms,
      count: sortedRooms.length,
      debug: {
        totalWaitingRooms: querySnapshot.size,
        publicRoomsFound: publicRooms.length
      }
    });

  } catch (error) {
    console.error('Error fetching public rooms:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch public rooms',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
