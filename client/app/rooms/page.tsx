"use client";
import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { FloatingDock } from "@/components/ui/floating-dock";
import { WavyBackground } from "@/components/ui/wavy-background";
import BlackHoleLoader from "@/components/ui/black-hole-loader";
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay";
import {
  IconHome,
  IconUsers,
  IconBrain,
  IconSettings,
  IconLogout,
  IconMap,
  IconDeviceGamepad2,
  IconUsersGroup,
  IconWorld,
  IconList
} from "@tabler/icons-react";

export default function CreateRoom() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
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
    },    {
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

  return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-8 relative">
        <div className="fixed top-4 right-4 z-50 md:top-6 md:right-8 lg:right-12">
          <GyanPointsDisplay />
        </div>
        
        <main className="min-h-screen flex flex-col items-center justify-center relative z-10 max-w-6xl w-full">
          
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-white mb-4">
              Choose Your Learning Path
            </h1>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              Challenge yourself with a solo quiz, create a room for competition, join an existing quiz, or play with random players
            </p>
          </div>

          {/* Updated Options Container - Now 4 columns for larger screens, 2x2 grid for medium */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl">
            
            {/* Solo Quiz Option */}
            <div 
              onClick={() => router.push('/solo-quiz')}
              className="group bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-8 cursor-pointer transition-all duration-300 hover:border-white/30"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-lg flex items-center justify-center">
                  <IconDeviceGamepad2 className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-3">
                  Solo Quiz
                </h3>
                
                <p className="text-neutral-400 mb-6">
                  Test your knowledge with personalized quizzes and track your progress.
                </p>
                
                <button className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300">
                  Start Solo Quiz
                </button>
              </div>
            </div>

            {/* Create Room Option */}
            <div 
              onClick={() => router.push('/rooms/create')} // Changed from '/room-setup'
              className="group bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-8 cursor-pointer transition-all duration-300 hover:border-white/30"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-lg flex items-center justify-center">
                  <IconUsersGroup className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-3">
                  Create Quiz Room
                </h3>
                
                <p className="text-neutral-400 mb-6">
                  Create a room for competitive quiz battles with Gyan coin rewards.
                </p>
                
                <button className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300">
                  Create Room
                </button>
              </div>
            </div>

            {/* Join Room Option */}
            <div 
              onClick={() => router.push('/join-room')}
              className="group bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-8 cursor-pointer transition-all duration-300 hover:border-white/30"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-lg flex items-center justify-center">
                  <IconUsers className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-3">
                  Join Room
                </h3>
                
                <p className="text-neutral-400 mb-6">
                  Have a room code? Join an existing quiz competition and compete with others.
                </p>
                
                <button className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300">
                  Join with Code
                </button>
              </div>
            </div>

            {/* Play with Random Option */}
            <div 
              onClick={() => router.push('/rooms/random')}
              className="group bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-8 cursor-pointer transition-all duration-300 hover:border-white/30"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-lg flex items-center justify-center">
                  <IconWorld className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-3">
                  Play with Random
                </h3>
                
                <p className="text-neutral-400 mb-6">
                  Join public rooms and compete with random players from around the world.
                </p>
                
                <button className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300">
                  Find Random Match
                </button>
              </div>
            </div>
          </div>          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
            <FloatingDock
              mobileClassName="translate-y-20"
              items={dockLinks}
              activeItem="/rooms"
            />
          </div>
        </main>
      </WavyBackground>
    </div>
  );
}