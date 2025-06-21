"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { apiService } from '@/lib/api';
import { FloatingDock } from "@/components/ui/floating-dock";
import { WavyBackground } from "@/components/ui/wavy-background";
import BlackHoleLoader from "@/components/ui/black-hole-loader";
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay";
import { Card, CardBody, Button, Input, Skeleton } from "@heroui/react";
import toast from 'react-hot-toast';
import {
  IconHome,
  IconUsers,
  IconBrain,
  IconSettings,
  IconLogout,
  IconPlus,
  IconMap,
  IconCalendar,
  IconEye,
  IconChevronRight,
  IconSearch,
  IconFilter,
  IconGridDots,
  IconList,
  IconSortAscending,
  IconSortDescending
} from "@tabler/icons-react";

interface MindMap {
  id: string;
  title: string;
  subject: string;
  created_at: string;
  updated_at: string;
  nodes_count?: number;
}

export default function Dashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [displayName, setDisplayName] = useState('');

  // Update display name when user changes or when profile is updated
  useEffect(() => {
    const updateDisplayName = () => {
      const savedProfile = localStorage.getItem('adhyayan-profile');
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile);
          setDisplayName(profile.displayName || user?.displayName || '');
        } catch (error) {
          setDisplayName(user?.displayName || '');
        }
      } else {
        setDisplayName(user?.displayName || '');
      }
    };

    updateDisplayName();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      updateDisplayName();
    };

    const handleSettingsUpdate = (event: CustomEvent) => {
      if (event.detail?.profile?.displayName) {
        setDisplayName(event.detail.profile.displayName);
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);

    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
      window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    };
  }, [user]);

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Generate a fallback avatar URL
  const getFallbackAvatar = () => {
    const name = displayName || user?.displayName || user?.email || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=374151&color=ffffff&size=80&font-size=0.33`;
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
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
        <IconBrain className="h-full w-full text-red-400 dark:text-red-400" />
      ),
      href: "/dashboard",
    },
    {
      title: "Quiz",
      icon: (
        <IconUsers className="h-full w-full text-neutral-500 dark:text-neutral-300" />
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
  ];return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-8 relative">
          {/* Gyan Points Display - Top Right Corner */}
        <div className="fixed top-4 right-4 z-50 md:top-6 md:right-8 lg:right-12">
          <GyanPointsDisplay />
        </div>{/* Welcome Message */}
        <div className="text-center mb-16 z-10">
          <div className="flex items-center justify-center mb-6">
            <div className="relative mr-4">
              {/* Fallback/Loading avatar */}
              <div className="w-20 h-20 rounded-full border-4 border-neutral-700 bg-neutral-800 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">
                  {(displayName?.charAt(0) || user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                </span>
              </div>
              
              {/* Actual user image */}
              {user?.photoURL && !imageError && (
                <img 
                  src={user.photoURL} 
                  alt={displayName || user.displayName || user.email || 'User'} 
                  className={`absolute inset-0 w-20 h-20 rounded-full border-4 border-neutral-700 object-cover transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )}
              
              {/* Fallback to generated avatar if no photoURL or image failed */}
              {(!user?.photoURL || imageError) && (
                <img 
                  src={getFallbackAvatar()} 
                  alt={displayName || user?.displayName || user?.email || 'User'} 
                  className="absolute inset-0 w-20 h-20 rounded-full border-4 border-neutral-700 object-cover"
                />
              )}
            </div>
            <div className="flex flex-col items-start">
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome back, {displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}! 👋
              </h1>
              <p className="text-neutral-200 text-lg">
                Ready to explore the future of AI-powered learning?
              </p>
            </div>
          </div>
        </div>        {/* Floating Dock positioned like macOS taskbar */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <FloatingDock
            mobileClassName="translate-y-20"
            items={dockLinks}
            activeItem="/dashboard"
          />
        </div>
      </WavyBackground>
    </div>
  );
}
