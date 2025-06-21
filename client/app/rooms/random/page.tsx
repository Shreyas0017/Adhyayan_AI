"use client";
import React, { useState, useEffect } from 'react';
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
  IconRefresh,
  IconClock,
  IconTrophy,
  IconPlayerPlay
} from "@tabler/icons-react";

interface PublicRoom {
  roomCode: string;
  roomName: string;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  hostName: string;
  participantCount: number;
  maxParticipants: number;
  createdAt: string;
  settings: {
    questionCount: number;
    timePerQuestion: number;
  };
}

export default function RandomRoomPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPublicRooms = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/rooms/public');
      if (response.ok) {
        const data = await response.json();
        setPublicRooms(data.rooms || []);
      } else {
        setError('Failed to fetch public rooms');
      }
    } catch (error) {
      console.error('Error fetching public rooms:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPublicRooms();
    }
  }, [isAuthenticated]);

  const handleJoinRoom = async (roomCode: string) => {
    if (!user) {
      setError('You must be logged in to join a room');
      return;
    }

    setIsJoining(roomCode);
    setError(null);

    try {
      const joinResponse = await fetch(`/api/rooms/${roomCode}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          userName: user.displayName || user.email || 'Anonymous User'
        }),
      });

      if (joinResponse.ok) {
        router.push(`/quiz-room/${roomCode}`);
      } else {
        const errorData = await joinResponse.json();
        setError(errorData.error || 'Failed to join room');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsJoining(null);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'hard': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
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

  return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        <div className="fixed top-4 right-4 z-50">
          <GyanPointsDisplay />
        </div>
        
        <div className="fixed top-4 left-4 z-50">
          <button 
            onClick={() => router.push('/rooms')}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200"
          >
            <IconArrowLeft className="h-4 w-4" />
            Back to Rooms
          </button>
        </div>

        {error && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 max-w-md">
            <IconAlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="w-full max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 via-red-500 to-pink-600 bg-clip-text text-transparent mb-4">
              Play with Random Players
            </h1>
            <p className="text-neutral-300 text-xl max-w-2xl mx-auto">
              Join public rooms and compete with players from around the world
            </p>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-neutral-400">
              <IconUsers className="h-5 w-5" />
              <span>{publicRooms.length} public rooms available</span>
            </div>
            <button
              onClick={fetchPublicRooms}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200 disabled:opacity-50"
            >
              <IconRefresh className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center">
              <BlackHoleLoader />
              <p className="text-neutral-400 mt-4">Finding available rooms...</p>
            </div>
          ) : publicRooms.length === 0 ? (
            <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center">
              <IconUsers className="h-16 w-16 text-neutral-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">No Public Rooms Available</h3>
              <p className="text-neutral-400 mb-6">
                There are no public rooms waiting for players right now. Why not create your own?
              </p>
              <button
                onClick={() => router.push('/rooms/create')}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
              >
                Create Public Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicRooms.map((room) => (
                <div
                  key={room.roomCode}
                  className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1 truncate">
                        {room.roomName}
                      </h3>
                      <p className="text-sm text-neutral-400">
                        Host: {room.hostName}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(room.difficulty)}`}>
                      {room.difficulty}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-neutral-300">
                      <IconTrophy className="h-4 w-4" />
                      <span>{room.subject} - {room.topic}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-300">
                      <IconUsers className="h-4 w-4" />
                      <span>{room.participantCount}/{room.maxParticipants} players</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-300">
                      <IconClock className="h-4 w-4" />
                      <span>{room.settings.questionCount} questions, {room.settings.timePerQuestion}s each</span>
                    </div>
                  </div>

                  <div className="w-full bg-neutral-700 rounded-full h-2 mb-4">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(room.participantCount / room.maxParticipants) * 100}%` }}
                    />
                  </div>

                  <button
                    onClick={() => handleJoinRoom(room.roomCode)}
                    disabled={isJoining === room.roomCode || room.participantCount >= room.maxParticipants}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  >
                    {isJoining === room.roomCode ? (
                      <>
                        <IconLoader2 className="h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : room.participantCount >= room.maxParticipants ? (
                      'Room Full'
                    ) : (
                      <>
                        <IconPlayerPlay className="h-4 w-4" />
                        Join Room
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </WavyBackground>
    </div>
  );
}
