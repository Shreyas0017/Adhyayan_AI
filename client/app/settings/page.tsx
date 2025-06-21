"use client";
import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { FloatingDock } from "@/components/ui/floating-dock";
import { WavyBackground } from "@/components/ui/wavy-background";
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay";
import BlackHoleLoader from "@/components/ui/black-hole-loader";
import {
  IconHome,
  IconUsers,
  IconBrain,
  IconSettings,
  IconLogout,
  IconMap,
  IconUser,
  IconBell,
  IconShield,
  IconPalette,
  IconLanguage,
  IconCamera,
  IconDeviceFloppy,
  IconTrash,
  IconDownload,
  IconEye,
  IconEyeOff
} from "@tabler/icons-react";

export default function Settings() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [selectedAccentColor, setSelectedAccentColor] = useState('orange');

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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
      title: "Create Room",
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

  const settingsTabs = [
    { id: 'profile', label: 'Profile', icon: IconUser },
    { id: 'notifications', label: 'Notifications', icon: IconBell },
    { id: 'privacy', label: 'Privacy', icon: IconShield },
    { id: 'appearance', label: 'Appearance', icon: IconPalette },
    { id: 'language', label: 'Language', icon: IconLanguage },
  ];
  return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-start p-8 pt-16 relative">
          {/* Gyan Points Display - Top Right Corner */}
        <div className="fixed top-4 right-4 z-50 md:top-6 md:right-8 lg:right-12">
          <GyanPointsDisplay />
        </div>
        
        {/* Main Content */}
        <main className="min-h-screen flex flex-col items-center justify-start relative z-10 max-w-6xl w-full">
          
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 via-red-500 to-pink-600 bg-clip-text text-transparent mb-4">
              Settings ⚙️
            </h1>
            <p className="text-neutral-300 text-xl">
              Customize your Adhyayan AI experience
            </p>
          </div>

          {/* Settings Container */}
          <div className="w-full mb-20">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              
              {/* Settings Tabs */}
              <div className="flex overflow-x-auto border-b border-white/10 bg-black/20">
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
              <div className="p-8">
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
                          alt={user.displayName || 'User'} 
                          className="w-24 h-24 rounded-full border-4 border-orange-500/30 group-hover:border-orange-400 transition-colors"
                        />
                        <button className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <IconCamera className="h-6 w-6 text-white" />
                        </button>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white">{user.displayName}</h3>
                        <p className="text-neutral-400 mb-3">{user.email}</p>
                        <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg text-sm transition-all duration-300 flex items-center gap-2">
                          <IconCamera className="h-4 w-4" />
                          Change Avatar
                        </button>
                      </div>
                    </div>

                    {/* Profile Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-neutral-300">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300"
                        />
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
                      </div>
                    </div>

                    {/* Additional Profile Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-neutral-300">
                          Learning Focus
                        </label>
                        <select className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300">
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
                        <select className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300">
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

                {activeTab === 'notifications' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-bold text-white">Notification Preferences</h2>
                      <IconBell className="h-8 w-8 text-orange-400" />
                    </div>
                    
                    <div className="space-y-4">
                      {[
                        { 
                          label: 'Email Notifications', 
                          desc: 'Receive study updates and achievements via email',
                          defaultChecked: true
                        },
                        { 
                          label: 'Push Notifications', 
                          desc: 'Get instant notifications on your device',
                          defaultChecked: true
                        },
                        { 
                          label: 'Study Reminders', 
                          desc: 'Daily reminders to maintain your learning streak',
                          defaultChecked: false
                        },
                        { 
                          label: 'Achievement Alerts', 
                          desc: 'Notifications when you earn badges or complete milestones',
                          defaultChecked: true
                        },
                        { 
                          label: 'Social Updates', 
                          desc: 'When friends join study rooms or share progress',
                          defaultChecked: false
                        },
                        { 
                          label: 'New Feature Announcements', 
                          desc: 'Be the first to know about new Adhyayan AI features',
                          defaultChecked: true
                        },
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-6 bg-white/5 rounded-xl border border-white/10 hover:bg-white/8 transition-all duration-300">
                          <div className="flex-1">
                            <h3 className="text-white font-medium text-lg">{item.label}</h3>
                            <p className="text-neutral-400 text-sm mt-1">{item.desc}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input type="checkbox" className="sr-only peer" defaultChecked={item.defaultChecked} />
                            <div className="w-12 h-6 bg-neutral-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300/20 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-500"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'privacy' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-bold text-white">Privacy & Security</h2>
                      <IconShield className="h-8 w-8 text-orange-400" />
                    </div>
                    
                    <div className="space-y-6">
                      {/* Profile Visibility */}
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-3 mb-4">
                          <IconEye className="h-5 w-5 text-orange-400" />
                          <h3 className="text-white font-medium text-lg">Profile Visibility</h3>
                        </div>
                        <p className="text-neutral-400 text-sm mb-4">Control who can see your profile and learning progress</p>
                        <select className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300">
                          <option value="public" className="bg-gray-800">Public - Everyone can see</option>
                          <option value="friends" className="bg-gray-800">Friends - Only friends can see</option>
                          <option value="private" className="bg-gray-800">Private - Only you can see</option>
                        </select>
                      </div>

                      {/* Data Management */}
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-3 mb-4">
                          <IconDownload className="h-5 w-5 text-blue-400" />
                          <h3 className="text-white font-medium text-lg">Data Export</h3>
                        </div>
                        <p className="text-neutral-400 text-sm mb-4">Download your complete learning data and progress history</p>
                        <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl transition-all duration-300 flex items-center gap-2">
                          <IconDownload className="h-4 w-4" />
                          Export My Data
                        </button>
                      </div>

                      {/* Account Deletion */}
                      <div className="p-6 bg-red-500/10 border-2 border-red-500/30 rounded-xl">
                        <div className="flex items-center gap-3 mb-4">
                          <IconTrash className="h-5 w-5 text-red-400" />
                          <h3 className="text-red-300 font-medium text-lg">Delete Account</h3>
                        </div>
                        <p className="text-neutral-400 text-sm mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
                        <button className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl transition-all duration-300 flex items-center gap-2">
                          <IconTrash className="h-4 w-4" />
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'appearance' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-bold text-white">Appearance Settings</h2>
                      <IconPalette className="h-8 w-8 text-orange-400" />
                    </div>
                    
                    <div className="space-y-6">
                      {/* Theme Selection */}
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <h3 className="text-white font-medium text-lg mb-4">Theme Preference</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { name: 'Dark', desc: 'Optimal for focus', available: true },
                            { name: 'Light', desc: 'Coming soon', available: false },
                            { name: 'Auto', desc: 'System preference', available: false }
                          ].map((theme) => (
                            <label key={theme.name} className={`relative ${theme.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                              <input 
                                type="radio" 
                                name="theme" 
                                className="sr-only peer" 
                                defaultChecked={theme.name === 'Dark'} 
                                disabled={!theme.available}
                              />
                              <div className={`p-6 bg-white/5 border-2 rounded-xl text-center transition-all duration-300 ${
                                theme.name === 'Dark' && theme.available 
                                  ? 'border-orange-500 bg-orange-500/10' 
                                  : 'border-white/10 hover:border-white/20'
                              }`}>
                                <div className="text-white font-medium text-lg">{theme.name}</div>
                                <div className="text-neutral-400 text-sm mt-1">{theme.desc}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Accent Color */}
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <h3 className="text-white font-medium text-lg mb-4">Accent Color</h3>
                        <div className="grid grid-cols-6 gap-4">
                          {[
                            { name: 'orange', class: 'bg-orange-500' },
                            { name: 'blue', class: 'bg-blue-500' },
                            { name: 'green', class: 'bg-green-500' },
                            { name: 'purple', class: 'bg-purple-500' },
                            { name: 'red', class: 'bg-red-500' },
                            { name: 'yellow', class: 'bg-yellow-500' }
                          ].map((color) => (
                            <button
                              key={color.name}
                              onClick={() => setSelectedAccentColor(color.name)}
                              className={`w-12 h-12 rounded-full ${color.class} hover:scale-110 transition-transform border-4 ${
                                selectedAccentColor === color.name ? 'border-white' : 'border-transparent'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'language' && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-bold text-white">Language & Region</h2>
                      <IconLanguage className="h-8 w-8 text-orange-400" />
                    </div>
                    
                    <div className="space-y-6">
                      {/* Display Language */}
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <h3 className="text-white font-medium text-lg mb-2">Display Language</h3>
                        <p className="text-neutral-400 text-sm mb-4">Choose your preferred language for the interface</p>
                        <select className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300">
                          <option value="en" className="bg-gray-800">English</option>
                          <option value="es" className="bg-gray-800">Español (Spanish)</option>
                          <option value="fr" className="bg-gray-800">Français (French)</option>
                          <option value="de" className="bg-gray-800">Deutsch (German)</option>
                          <option value="hi" className="bg-gray-800">हिन्दी (Hindi)</option>
                          <option value="zh" className="bg-gray-800">中文 (Mandarin)</option>
                          <option value="ja" className="bg-gray-800">日本語 (Japanese)</option>
                          <option value="ko" className="bg-gray-800">한국어 (Korean)</option>
                        </select>
                      </div>

                      {/* Time Zone */}
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <h3 className="text-white font-medium text-lg mb-2">Time Zone</h3>
                        <p className="text-neutral-400 text-sm mb-4">Set your local time zone for accurate scheduling and reminders</p>
                        <select className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all duration-300">
                          <option value="UTC-5" className="bg-gray-800">UTC-5 (Eastern Time)</option>
                          <option value="UTC-6" className="bg-gray-800">UTC-6 (Central Time)</option>
                          <option value="UTC-7" className="bg-gray-800">UTC-7 (Mountain Time)</option>
                          <option value="UTC-8" className="bg-gray-800">UTC-8 (Pacific Time)</option>
                          <option value="UTC+0" className="bg-gray-800">UTC+0 (GMT)</option>
                          <option value="UTC+5:30" className="bg-gray-800">UTC+5:30 (IST)</option>
                          <option value="UTC+9" className="bg-gray-800">UTC+9 (JST)</option>
                        </select>
                      </div>

                      {/* Date Format */}
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <h3 className="text-white font-medium text-lg mb-2">Date Format</h3>
                        <p className="text-neutral-400 text-sm mb-4">Choose how dates are displayed throughout the app</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { format: 'MM/DD/YYYY', example: '12/25/2024' },
                            { format: 'DD/MM/YYYY', example: '25/12/2024' },
                            { format: 'YYYY-MM-DD', example: '2024-12-25' }
                          ].map((option, index) => (
                            <label key={index} className="relative cursor-pointer">
                              <input type="radio" name="dateFormat" className="sr-only peer" defaultChecked={index === 0} />
                              <div className="p-4 bg-white/5 border-2 border-white/10 rounded-xl text-center transition-all duration-300 peer-checked:border-orange-500 peer-checked:bg-orange-500/10 hover:border-white/20">
                                <div className="text-white font-medium">{option.format}</div>
                                <div className="text-neutral-400 text-sm">{option.example}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="mt-12 pt-8 border-t border-white/10">
                  <button 
                    onClick={handleSaveSettings}
                    disabled={isSaving}
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
                        Save All Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Dock */}
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
