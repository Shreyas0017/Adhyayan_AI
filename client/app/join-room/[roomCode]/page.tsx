"use client";
import React, { useState, useEffect, use } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { WavyBackground } from "@/components/ui/wavy-background";
import BlackHoleLoader from "@/components/ui/black-hole-loader";
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay";
import {
  IconArrowLeft,
  IconUsers,
  IconLoader2,
  IconAlertCircle,
  IconCrown,
  IconClock
} from "@tabler/icons-react";

interface JoinRoomProps {
  params: Promise<{ roomCode: string }>;
}

export default function JoinRoomPage({ params }: JoinRoomProps) {
  // Unwrap the params Promise
  const resolvedParams = use(params);
  const { roomCode } = resolvedParams;
  
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [room, setRoom] = useState<any>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated && roomCode) {
      fetchRoom();
    }
  }, [isAuthenticated, roomCode]);

  const fetchRoom = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomCode}`);
      
      if (response.ok) {
        const roomData = await response.json();
        setRoom(roomData);
        
        // Check if user is already in the room
        const isAlreadyParticipant = roomData.participants.some((p: any) => p.userId === user?.uid);
        if (isAlreadyParticipant) {
          router.push(`/quiz-room/${roomCode}`);
          return;
        }
      } else {
        setError('Room not found');
      }
    } catch (error) {
      setError('Failed to load room');
    }
  };

  const handleJoinRoom = async () => {
    if (!user || joining) return;
    
    setJoining(true);
    setError('');

    try {
      const response = await fetch(`/api/rooms/${roomCode}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          userName: user.displayName || user.email || 'Anonymous User'
        }),
      });

      if (response.ok) {
        router.push(`/quiz-room/${roomCode}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to join room');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <BlackHoleLoader />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.push('/');
    return null;
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <BlackHoleLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        <div className="fixed top-4 right-4 z-50">
          <GyanPointsDisplay />
        </div>

        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg px-4 py-2 text-white hover:bg-white/10 transition-all duration-300"
          >
            <IconArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        {error && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 max-w-md">
            <IconAlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="max-w-2xl w-full mx-auto">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <IconUsers className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Join Quiz Room</h1>
              <p className="text-neutral-400">You're about to join this quiz competition</p>
            </div>

            {/* Room Details */}
            <div className="bg-white/5 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-4">{room.roomName}</h2>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-neutral-400 mb-4">
                <div>Subject: <span className="text-white">{room.subject}</span></div>
                <div>Topic: <span className="text-white">{room.topic}</span></div>
                <div>Difficulty: <span className="text-white">{room.difficulty}</span></div>
                <div>Questions: <span className="text-white">{room.settings?.questionCount}</span></div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconUsers className="h-4 w-4 text-neutral-400" />
                  <span className="text-sm text-neutral-400">
                    {room.participants.length}/{room.maxParticipants} participants
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <IconClock className="h-4 w-4 text-neutral-400" />
                  <span className="text-sm text-neutral-400">
                    {room.settings?.timePerQuestion}s per question
                  </span>
                </div>
              </div>
            </div>

            {/* Participants */}
            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <h3 className="text-white font-medium mb-3">Current Participants</h3>
              <div className="space-y-2">
                {room.participants.map((participant: any, index: number) => (
                  <div key={participant.userId} className="flex items-center gap-2">
                    {participant.userId === room.hostId && (
                      <IconCrown className="h-4 w-4 text-yellow-400" />
                    )}
                    <span className="text-neutral-300 text-sm">{participant.userName}</span>
                    {participant.userId === room.hostId && (
                      <span className="text-xs text-yellow-400">Host</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Entry Fee Info */}
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <h3 className="text-yellow-200 font-medium mb-2">Entry Fee & Prize</h3>
              <p className="text-yellow-100 text-sm">
                • Entry fee: 5 Gyan Coins<br/>
                • Current prize pool: {room.prizePool} Gyan Coins<br/>
                • Winner takes all collected coins
              </p>
            </div>

            {/* Join Button */}
            <button
              onClick={handleJoinRoom}
              disabled={joining || room.participants.length >= room.maxParticipants}
              className={`w-full py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                joining || room.participants.length >= room.maxParticipants
                  ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {joining ? (
                <>
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  Joining Room...
                </>
              ) : room.participants.length >= room.maxParticipants ? (
                'Room is Full'
              ) : (
                <>
                  <IconUsers className="h-4 w-4" />
                  Join Room (5 Gyan Coins)
                </>
              )}
            </button>
          </div>
        </div>
      </WavyBackground>
    </div>
  );
}