"use client";
import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { FloatingDock } from "@/components/ui/floating-dock";
import { WavyBackground } from "@/components/ui/wavy-background";
import BlackHoleLoader from "@/components/ui/black-hole-loader";
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay";
import {
  IconArrowLeft,
  IconUsers,
  IconLoader2,
  IconAlertCircle,
  IconSearch,
  IconHome,
  IconBrain,
  IconSettings,
  IconLogout,
  IconMap,
  IconList,
} from "@tabler/icons-react";

export default function JoinRoom() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  const dockLinks = [
    {
      title: "Home",
      icon: (
        <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/",
    },
    {
      title: "Dashboard",
      icon: (
        <IconBrain className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/dashboard",
    },
    {
      title: "Quiz",
      icon: (
        <IconUsers className="h-full w-full text-red-400 dark:text-red-400" />
      ),
      href: "/create-room",
    },
    {
      title: "Mind Map",
      icon: (
        <IconMap className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/mind-map",
    },
    {
      title: "Flash Cards",
      icon: (
        <IconList className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/flashCard",
    },
    {
      title: "Settings",
      icon: (
        <IconSettings className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/settings",
    },
    {
      title: "Sign Out",
      icon: (
        <IconLogout className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: handleSignOut,
    },
  ];

  const handleRoomCodeChange = (value: string) => {
    // Convert to uppercase and limit to 6 characters
    const formattedCode = value.toUpperCase().slice(0, 6);
    setRoomCode(formattedCode);
    setError(null);
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim() || roomCode.length < 6) {
      setError('Please enter a valid 6-character room code');
      return;
    }

    if (!user) {
      setError('You must be logged in to join a room');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      // First, check if room exists
      const roomResponse = await fetch(`/api/rooms/${roomCode}`);
      
      if (!roomResponse.ok) {
        if (roomResponse.status === 404) {
          setError('Room not found. Please check the room code.');
        } else {
          setError('Failed to find room. Please try again.');
        }
        return;
      }

      const room = await roomResponse.json();
      
      if (room.status !== 'waiting') {
        setError('This room is no longer accepting participants.');
        return;
      }

      if (room.participants.length >= room.maxParticipants) {
        setError('This room is full.');
        return;
      }

      // Check if user is already in the room
      const isAlreadyParticipant = room.participants.some((p: any) => p.userId === user.uid);
      if (isAlreadyParticipant) {
        // If already a participant, just redirect to room
        router.push(`/quiz-room/${roomCode}`);
        return;
      }

      // Join the room
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
      setIsJoining(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoinRoom();
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
            onClick={() => router.push('/create-room')}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200"
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

        <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <IconUsers className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Join Quiz Room</h1>
            <p className="text-neutral-400">Enter a room code to join the competition</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Room Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => handleRoomCodeChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter 6-character code"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center text-xl font-mono tracking-widest uppercase"
                  maxLength={6}
                  autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <IconSearch className="h-5 w-5 text-neutral-400" />
                </div>
              </div>
              <div className="mt-2 text-xs text-neutral-500">
                Room codes are 6 characters long (e.g., ABC123)
              </div>
            </div>

            {/* Entry Fee Info */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <IconUsers className="h-4 w-4 text-yellow-400" />
                <span className="text-yellow-400 font-medium">Entry Fee: 5 Gyan Coins</span>
              </div>
              <p className="text-neutral-300 text-sm">
                Joining this room will cost 5 Gyan coins. Winner takes all!
              </p>
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={isJoining || roomCode.length < 6}
              className={`w-full py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                isJoining || roomCode.length < 6
                  ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isJoining ? (
                <>
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  Joining Room...
                </>
              ) : (
                <>
                  <IconUsers className="h-4 w-4" />
                  Join Room
                </>
              )}
            </button>

            <div className="text-center">
              <p className="text-neutral-400 text-sm mb-2">Don't have a room code?</p>
              <button
                onClick={() => router.push('/room-setup')}
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                Create your own room
              </button>            </div>
          </div>
        </div>

        {/* Floating Dock positioned like macOS taskbar */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <FloatingDock
            mobileClassName="translate-y-20"
            items={dockLinks}
            activeItem="/join-room"
          />
        </div>
      </WavyBackground>
    </div>
  );
}