"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { FloatingDock } from "@/components/ui/floating-dock";
import { WavyBackground } from "@/components/ui/wavy-background";
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay";
import BlackHoleLoader from "@/components/ui/black-hole-loader";
import { toast } from 'react-hot-toast';
import {
  IconHome,
  IconUsers,
  IconBrain,
  IconSettings,
  IconLogout,
  IconMap,
  IconUser,
  IconPalette,
  IconDeviceFloppy,
  IconEye,
  IconCheck,
  IconVolumeOff,
  IconVolume,
  IconList
} from "@tabler/icons-react";

// Types for settings
interface UserPreferences {
  theme: 'dark' | 'light' | 'auto';
  accentColor: string;
  soundEffects: boolean;
  animations: boolean;
  learningFocus: string;
  experienceLevel: string;
  autoSave: boolean;
  showHints: boolean;
}

interface UserProfile {
  displayName: string;
  bio: string;
  learningFocus: string;
  experienceLevel: string;
}

export default function Settings() {
  const { user, loading, isAuthenticated, logout, updateUserProfile } = useAuth();
  const router = useRouter();
  
  // State management
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Profile settings
  const [profile, setProfile] = useState<UserProfile>({
    displayName: '',
    bio: '',
    learningFocus: '',
    experienceLevel: '',
  });

  // Settings states
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'dark',
    accentColor: 'orange',
    soundEffects: true,
    animations: true,
    learningFocus: '',
    experienceLevel: '',
    autoSave: true,
    showHints: true,
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = () => {
    try {
      // Load profile data
      const savedProfile = localStorage.getItem('adhyayan-profile');
      if (savedProfile) {
        const profileData = JSON.parse(savedProfile);
        setProfile(profileData);
      } else {
        // Initialize with user data
        setProfile({
          displayName: user?.displayName || '',
          bio: '',
          learningFocus: '',
          experienceLevel: '',
        });
      }

      // Load other settings
      const savedPreferences = localStorage.getItem('adhyayan-preferences');

      if (savedPreferences) {
        const prefData = JSON.parse(savedPreferences);
        setPreferences(prefData);
        // Apply saved preferences immediately
        applyPreferences(prefData);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const applyPreferences = (prefs: UserPreferences) => {
    // Apply theme
    document.documentElement.setAttribute('data-theme', prefs.theme);
    
    // Apply accent color
    const accentColorValue = getAccentColorValue(prefs.accentColor);
    document.documentElement.style.setProperty('--accent-color', accentColorValue);
    
    // Apply animations
    if (!prefs.animations) {
      document.documentElement.style.setProperty('--animation-duration', '0s');
    } else {
      document.documentElement.style.setProperty('--animation-duration', '0.3s');
    }

    // Store global settings for other components to use
    (window as any).adhyayanSettings = {
      soundEffects: prefs.soundEffects,
      animations: prefs.animations,
      showHints: prefs.showHints,
      autoSave: prefs.autoSave,
    };
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('adhyayan-profile', JSON.stringify(profile));
      localStorage.setItem('adhyayan-preferences', JSON.stringify(preferences));

      // Apply preferences immediately
      applyPreferences(preferences);

      // Update auth context with new profile
      if (updateUserProfile) {
        await updateUserProfile({
          displayName: profile.displayName,
          bio: profile.bio,
        });
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Settings saved successfully!', {
        duration: 3000,
        style: {
          background: '#1a1a1a',
          color: '#ffffff',
          border: '1px solid #10b981',
        },
      });

      setHasChanges(false);
      
      // Trigger a custom event to notify other components
      window.dispatchEvent(new CustomEvent('settingsUpdated', {
        detail: { profile, preferences }
      }));

    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.', {
        duration: 3000,
        style: {
          background: '#1a1a1a',
          color: '#ffffff',
          border: '1px solid #ef4444',
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getAccentColorValue = (color: string) => {
    const colors: { [key: string]: string } = {
      orange: '#f97316',
      blue: '#3b82f6',
      green: '#10b981',
      purple: '#8b5cf6',
      red: '#ef4444',
      yellow: '#f59e0b',
      pink: '#ec4899',
      cyan: '#06b6d4',
    };
    return colors[color] || colors.orange;
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleExportData = () => {
    const userData = {
      profile,
      settings: {
        preferences,
      },
      exportDate: new Date().toISOString(),
      user: {
        email: user?.email,
        uid: user?.uid,
      }
    };

    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `adhyayan-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    toast.success('Data exported successfully!', {
      duration: 3000,
      style: {
        background: '#1a1a1a',
        color: '#ffffff',
        border: '1px solid #10b981',
      },
    });
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.error('Account deletion is not implemented yet. Please contact support.', {
        duration: 5000,
        style: {
          background: '#1a1a1a',
          color: '#ffffff',
          border: '1px solid #ef4444',
        },
      });
    }
  };

  // Track changes
  const handleProfileChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handlePreferencesChange = (field: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    
    // Apply some changes immediately for instant feedback
    if (field === 'accentColor') {
      document.documentElement.style.setProperty('--accent-color', getAccentColorValue(value));
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
      icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/",
    },
    {
      title: "Dashboard",
      icon: <IconBrain className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/dashboard",
    },
    {
      title: "Quiz",
      icon: <IconUsers className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/create-room",
    },
    {
      title: "Mind Map",
      icon: <IconMap className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/mind-map",
    },    {
      title: "Flash Cards",
      icon: <IconList className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/flashCard",
    },
    {
      title: "Settings",
      icon: <IconSettings className="h-full w-full text-red-400 dark:text-red-400" />,
      href: "/settings",
    },
    {
      title: "Sign Out",
      icon: <IconLogout className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "#",
      onClick: handleSignOut,
    },
  ];

  const settingsTabs = [
    { id: 'profile', label: 'Profile', icon: IconUser },
    { id: 'preferences', label: 'Preferences', icon: IconPalette },
  ];

  return (
    <div className="min-h-screen relative overflow-auto">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-start p-4 pt-16 pb-40 relative">
        {/* Gyan Points Display */}
        <div className="fixed top-4 right-4 z-50 md:top-6 md:right-8 lg:right-12">
          <GyanPointsDisplay />
        </div>
        
        {/* Main Content */}
        <main className="flex flex-col items-center justify-start relative z-10 max-w-6xl w-full space-y-8">
          
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 via-red-500 to-pink-600 bg-clip-text text-transparent mb-4">
              Settings ⚙️
            </h1>
            <p className="text-neutral-300 text-xl">
              Customize your Adhyayan AI experience
            </p>
            {hasChanges && (
              <div className="mt-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-300 text-sm">
                You have unsaved changes
              </div>
            )}
          </div>

          {/* Settings Container */}
          <div className="w-full mb-32">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[calc(100vh-200px)] overflow-y-auto">
              
              {/* Settings Tabs */}
              <div className="flex overflow-x-auto border-b border-white/10 bg-black/20 sticky top-0 z-10">
                {settingsTabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-3 px-6 py-4 text-sm font-medium transition-all duration-300 whitespace-nowrap min-w-fit ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border-b-2 border-orange-500 shadow-lg'
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                      }`}
                    >
                      <IconComponent className="h-5 w-5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Settings Content */}
              <div className="p-4 md:p-8 max-h-[calc(80vh-70px)] overflow-y-auto">
                {activeTab === 'profile' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-bold text-white">Profile Settings</h2>
                      <IconUser className="h-8 w-8 text-orange-400" />
                    </div>
                    
                    {/* Profile Picture Section */}
                    <div className="flex items-center space-x-6 p-6 bg-white/5 rounded-xl border border-white/10">
                      <div className="relative group">
                        <img 
                          src={user.photoURL || '/default-avatar.png'} 
                          alt={profile.displayName || 'User'} 
                          className="w-24 h-24 rounded-full border-4 border-orange-500/30 group-hover:border-orange-400 transition-colors"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white">{profile.displayName || user.displayName}</h3>
                        <p className="text-neutral-400 mb-3">{user.email}</p>
                        <p className="text-sm text-neutral-500">Profile picture is managed by your authentication provider</p>
                      </div>
                    </div>

                    {/* Profile Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-neutral-300">
                          Display Name *
                        </label>
                        <input
                          type="text"
                          value={profile.displayName}
                          onChange={(e) => handleProfileChange('displayName', e.target.value)}
                          placeholder="Enter your display name"
                          className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300"
                        />
                        <p className="text-xs text-neutral-500">This name will appear throughout the app</p>
                      </div>
                      
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-neutral-300">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={user.email || ''}
                          disabled
                          className="w-full px-4 py-4 bg-neutral-800/50 border border-white/10 rounded-xl text-neutral-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-neutral-500">Email cannot be changed</p>
                      </div>
                    </div>

                    {/* Bio Section */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-neutral-300">
                        Bio
                      </label>
                      <textarea
                        value={profile.bio}
                        onChange={(e) => handleProfileChange('bio', e.target.value)}
                        placeholder="Tell us about yourself..."
                        className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300 h-32 resize-none"
                      />
                    </div>

                    {/* Learning Preferences */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-neutral-300">
                          Learning Focus
                        </label>
                        <select 
                          value={profile.learningFocus}
                          onChange={(e) => handleProfileChange('learningFocus', e.target.value)}
                          className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300"
                        >
                          <option value="" className="bg-gray-800">Select your main interest...</option>
                          <option value="programming" className="bg-gray-800">Programming & Development</option>
                          <option value="science" className="bg-gray-800">Science & Research</option>
                          <option value="mathematics" className="bg-gray-800">Mathematics</option>
                          <option value="languages" className="bg-gray-800">Languages</option>
                          <option value="arts" className="bg-gray-800">Arts & Design</option>
                          <option value="business" className="bg-gray-800">Business & Finance</option>
                        </select>
                      </div>
                      
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-neutral-300">
                          Experience Level
                        </label>
                        <select 
                          value={profile.experienceLevel}
                          onChange={(e) => handleProfileChange('experienceLevel', e.target.value)}
                          className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300"
                        >
                          <option value="" className="bg-gray-800">Select your level...</option>
                          <option value="beginner" className="bg-gray-800">Beginner</option>
                          <option value="intermediate" className="bg-gray-800">Intermediate</option>
                          <option value="advanced" className="bg-gray-800">Advanced</option>
                          <option value="expert" className="bg-gray-800">Expert</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'preferences' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-bold text-white">App Preferences</h2>
                      <IconPalette className="h-8 w-8 text-orange-400" />
                    </div>
                    
                    <div className="space-y-6">
                      {/* Theme Selection */}
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <h3 className="text-white font-medium text-lg mb-4">Theme Preference</h3>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { value: 'dark', label: 'Dark', desc: 'Currently active' },
                            { value: 'light', label: 'Light', desc: 'Coming soon' },
                            { value: 'auto', label: 'Auto', desc: 'Follow system' }
                          ].map((theme) => (
                            <button
                              key={theme.value}
                              onClick={() => theme.value === 'dark' && handlePreferencesChange('theme', theme.value)}
                              disabled={theme.value !== 'dark'}
                              className={`p-4 rounded-xl border-2 text-center transition-all ${
                                preferences.theme === theme.value
                                  ? 'border-orange-500 bg-orange-500/20'
                                  : theme.value === 'dark'
                                  ? 'border-neutral-600 bg-white/5 hover:border-orange-400'
                                  : 'border-neutral-700 bg-neutral-800/50 cursor-not-allowed opacity-50'
                              }`}
                            >
                              <div className="text-white font-medium">{theme.label}</div>
                              <div className="text-neutral-400 text-xs mt-1">{theme.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Accent Color */}
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <h3 className="text-white font-medium text-lg mb-4">Accent Color</h3>
                        <div className="grid grid-cols-8 gap-4">
                          {[
                            { name: 'orange', class: 'bg-orange-500' },
                            { name: 'blue', class: 'bg-blue-500' },
                            { name: 'green', class: 'bg-green-500' },
                            { name: 'purple', class: 'bg-purple-500' },
                            { name: 'red', class: 'bg-red-500' },
                            { name: 'yellow', class: 'bg-yellow-500' },
                            { name: 'pink', class: 'bg-pink-500' },
                            { name: 'cyan', class: 'bg-cyan-500' }
                          ].map((color) => (
                            <button
                              key={color.name}
                              onClick={() => handlePreferencesChange('accentColor', color.name)}
                              className={`w-12 h-12 rounded-full ${color.class} hover:scale-110 transition-transform border-4 ${
                                preferences.accentColor === color.name ? 'border-white' : 'border-transparent'
                              } relative`}
                            >
                              {preferences.accentColor === color.name && (
                                <IconCheck className="h-4 w-4 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* App Behavior */}
                      <div className="space-y-4">
                        {[
                          { 
                            key: 'soundEffects',
                            label: 'Sound Effects', 
                            desc: 'Play sounds for interactions and achievements',
                            icon: preferences.soundEffects ? IconVolume : IconVolumeOff
                          },
                          { 
                            key: 'animations',
                            label: 'Animations', 
                            desc: 'Enable smooth transitions and animations',
                            icon: IconPalette
                          },
                          { 
                            key: 'autoSave',
                            label: 'Auto Save', 
                            desc: 'Automatically save your progress',
                            icon: IconDeviceFloppy
                          },
                          { 
                            key: 'showHints',
                            label: 'Show Hints', 
                            desc: 'Display helpful tips and guidance',
                            icon: IconEye
                          },
                        ].map((item) => {
                          const IconComponent = item.icon;
                          return (
                            <div key={item.key} className="flex items-center justify-between p-6 bg-white/5 rounded-xl border border-white/10 hover:bg-white/8 transition-all duration-300">
                              <div className="flex items-center gap-4">
                                <IconComponent className="h-5 w-5 text-orange-400" />
                                <div className="flex-1">
                                  <h3 className="text-white font-medium text-lg">{item.label}</h3>
                                  <p className="text-neutral-400 text-sm mt-1">{item.desc}</p>
                                </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer ml-4">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={preferences[item.key as keyof UserPreferences] as boolean}
                                  onChange={(e) => handlePreferencesChange(item.key as keyof UserPreferences, e.target.checked)}
                                />
                                <div className="w-12 h-6 bg-neutral-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300/20 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-500"></div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="mt-12 pt-8 border-t border-white/10">
                  <button 
                    onClick={handleSaveSettings}
                    disabled={isSaving || !hasChanges}
                    className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 hover:from-orange-600 hover:via-red-600 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <IconDeviceFloppy className="h-5 w-5" />
                        {hasChanges ? 'Save All Changes' : 'No Changes to Save'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>          {/* Floating Dock */}
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
            <FloatingDock
              mobileClassName="translate-y-20"
              items={dockLinks}
              activeItem="/settings"
            />
          </div>
        </main>
      </WavyBackground>
    </div>
  );
}