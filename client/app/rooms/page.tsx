"use client";
import React from 'react';
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
  IconPlus,
  IconLogin
} from "@tabler/icons-react";

export default function RoomsPage() {
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

  const handleCreateRoom = () => {
    console.log('Create room clicked - navigating to /rooms/create');
    router.push('/rooms/create');
  };

  const handleJoinRoom = () => {
    console.log('Join room clicked - navigating to /rooms/join');
    router.push('/rooms/join');
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
      icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/",
    },
    {
      title: "Dashboard",
      icon: <IconBrain className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/dashboard",
    },
    {
      title: "Rooms",
      icon: <IconUsers className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/rooms",
    },
    {
      title: "Mind Map",
      icon: <IconMap className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/mind-map",
    },
    {
      title: "Settings",
      icon: <IconSettings className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/settings",
    },
    {
      title: "Sign Out",
      icon: <IconLogout className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "#",
      onClick: handleSignOut,
    },
  ];

  return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-8 relative">
        <div className="fixed top-4 right-4 z-50">
          <GyanPointsDisplay />
        </div>
        
        <main className="min-h-screen flex flex-col items-center justify-center relative z-10 max-w-6xl w-full">
          
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-600 bg-clip-text text-transparent mb-6">
              Quiz Rooms
            </h1>
            <p className="text-neutral-300 text-xl max-w-2xl mx-auto">
              Create your own quiz room or join others to compete and learn together
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            
            {/* Create Room Option */}
            <div 
              onClick={handleCreateRoom}
              className="group bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:border-blue-500/50 hover:bg-blue-500/5"
            >
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <IconPlus className="h-10 w-10 text-white" />
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors duration-300">
                  Create Room
                </h3>
                
                <p className="text-neutral-400 text-lg mb-8 leading-relaxed">
                  Set up your own quiz competition. Choose topics, difficulty, and invite friends to compete.
                </p>
                
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                    Custom Topics
                  </span>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                    AI Generated
                  </span>
                  <span className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-sm">
                    Win Prizes
                  </span>
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateRoom();
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform group-hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Create New Room
                </button>
              </div>
            </div>

            {/* Join Room Option */}
            <div 
              onClick={handleJoinRoom}
              className="group bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:border-green-500/50 hover:bg-green-500/5"
            >
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <IconLogin className="h-10 w-10 text-white" />
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-green-400 transition-colors duration-300">
                  Join Room
                </h3>
                
                <p className="text-neutral-400 text-lg mb-8 leading-relaxed">
                  Have a room code? Join an existing quiz competition and compete with others for prizes.
                </p>
                
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                    Quick Entry
                  </span>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                    Room Codes
                  </span>
                  <span className="px-3 py-1 bg-teal-500/20 text-teal-400 rounded-full text-sm">
                    Compete Now
                  </span>
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJoinRoom();
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform group-hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Join with Code
                </button>
              </div>
            </div>
          </div>

          {/* Debug Info */}
          <div className="mt-8 text-center">
            <p className="text-xs text-neutral-500">
              Debug: Current path - {typeof window !== 'undefined' ? window.location.pathname : 'SSR'}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-2xl">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">2.5K+</div>
              <div className="text-neutral-400 text-sm">Rooms Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">18K+</div>
              <div className="text-neutral-400 text-sm">Players Joined</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">45K+</div>
              <div className="text-neutral-400 text-sm">Questions Asked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-400">95%</div>
              <div className="text-neutral-400 text-sm">Success Rate</div>
            </div>
          </div>

          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
            <FloatingDock
              mobileClassName="translate-y-20"
              items={dockLinks}
            />
          </div>
        </main>
      </WavyBackground>
    </div>
  );
}