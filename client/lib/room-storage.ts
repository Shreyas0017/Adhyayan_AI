import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  arrayUnion, 
  arrayRemove,
  onSnapshot,
  Timestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Room, Participant } from './types';

const ROOMS_COLLECTION = 'quiz-rooms';

export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createRoom(room: Room): Promise<void> {
  try {
    const roomRef = doc(db, ROOMS_COLLECTION, room.roomCode);
    
    // Convert Date objects to Firestore Timestamps
    const roomData = {
      ...room,
      createdAt: Timestamp.fromDate(room.createdAt),
      participants: room.participants.map(p => ({
        ...p,
        joinedAt: Timestamp.fromDate(p.joinedAt)
      })),
      questionStartTime: room.questionStartTime ? Timestamp.fromDate(room.questionStartTime) : null,
      questionEndTime: room.questionEndTime ? Timestamp.fromDate(room.questionEndTime) : null,
    };
    
    await setDoc(roomRef, roomData);
    console.log(`Room created in Firebase: ${room.roomCode}`);
  } catch (error) {
    console.error('Error creating room in Firebase:', error);
    throw new Error('Failed to create room');
  }
}

export async function getRoom(roomCode: string): Promise<Room | null> {
  try {
    const roomRef = doc(db, ROOMS_COLLECTION, roomCode);
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) {
      return null;
    }
    
    const data = roomSnap.data();
    
    // Convert Firestore Timestamps back to Date objects
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      participants: data.participants.map((p: any) => ({
        ...p,
        joinedAt: p.joinedAt.toDate()
      })),
      questionStartTime: data.questionStartTime?.toDate() || null,
      questionEndTime: data.questionEndTime?.toDate() || null,
    } as Room;
  } catch (error) {
    console.error('Error getting room from Firebase:', error);
    return null;
  }
}

export async function updateRoom(roomCode: string, updates: Partial<Room>): Promise<Room | null> {
  try {
    const roomRef = doc(db, ROOMS_COLLECTION, roomCode);
    
    // Convert Date objects to Timestamps if present
    const updateData = { ...updates };
    if (updateData.questionStartTime) {
      updateData.questionStartTime = Timestamp.fromDate(updateData.questionStartTime as Date) as any;
    }
    if (updateData.questionEndTime) {
      updateData.questionEndTime = Timestamp.fromDate(updateData.questionEndTime as Date) as any;
    }
    if (updateData.participants) {
      updateData.participants = updateData.participants.map(p => ({
        ...p,
        joinedAt: Timestamp.fromDate(p.joinedAt)
      })) as any;
    }
    
    await updateDoc(roomRef, updateData);
    return await getRoom(roomCode);
  } catch (error) {
    console.error('Error updating room in Firebase:', error);
    return null;
  }
}

export async function addParticipant(roomCode: string, participant: Participant): Promise<Room | null> {
  try {
    const room = await getRoom(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }
    
    // Check if room is full
    if (room.participants.length >= room.maxParticipants) {
      throw new Error('Room is full');
    }
    
    // Check if participant already exists
    const existingParticipantIndex = room.participants.findIndex(p => p.userId === participant.userId);
    
    if (existingParticipantIndex >= 0) {
      // Update existing participant
      room.participants[existingParticipantIndex] = participant;
    } else {
      // Add new participant
      room.participants.push(participant);
      room.prizePool += room.entryFee;
    }
    
    return await updateRoom(roomCode, {
      participants: room.participants,
      prizePool: room.prizePool
    });
  } catch (error) {
    console.error('Error adding participant to Firebase:', error);
    throw error;
  }
}

export async function removeParticipant(roomCode: string, userId: string): Promise<Room | null> {
  try {
    const room = await getRoom(roomCode);
    if (!room) return null;
    
    const updatedParticipants = room.participants.filter(p => p.userId !== userId);
    const refundAmount = room.participants.length > updatedParticipants.length ? room.entryFee : 0;
    
    return await updateRoom(roomCode, {
      participants: updatedParticipants,
      prizePool: room.prizePool - refundAmount
    });
  } catch (error) {
    console.error('Error removing participant from Firebase:', error);
    return null;
  }
}

export async function deleteRoom(roomCode: string): Promise<void> {
  try {
    const roomRef = doc(db, ROOMS_COLLECTION, roomCode);
    await deleteDoc(roomRef);
  } catch (error) {
    console.error('Error deleting room from Firebase:', error);
    throw new Error('Failed to delete room');
  }
}

export async function getRoomsByHost(hostId: string): Promise<Room[]> {
  try {
    const q = query(
      collection(db, ROOMS_COLLECTION), 
      where('hostId', '==', hostId)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        participants: data.participants.map((p: any) => ({
          ...p,
          joinedAt: p.joinedAt.toDate()
        })),
        questionStartTime: data.questionStartTime?.toDate() || null,
        questionEndTime: data.questionEndTime?.toDate() || null,
      } as Room;
    });
  } catch (error) {
    console.error('Error getting rooms by host from Firebase:', error);
    return [];
  }
}

// Real-time listener for room updates
export function subscribeToRoom(roomCode: string, callback: (room: Room | null) => void): () => void {
  const roomRef = doc(db, ROOMS_COLLECTION, roomCode);
  
  return onSnapshot(roomRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const room: Room = {
        ...data,
        createdAt: data.createdAt.toDate(),
        participants: data.participants.map((p: any) => ({
          ...p,
          joinedAt: p.joinedAt.toDate()
        })),
        questionStartTime: data.questionStartTime?.toDate() || null,
        questionEndTime: data.questionEndTime?.toDate() || null,
      } as Room;
      callback(room);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error in room subscription:', error);
    callback(null);
  });
}