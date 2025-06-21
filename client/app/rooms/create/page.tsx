"use client";
import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { WavyBackground } from "@/components/ui/wavy-background";
import BlackHoleLoader from "@/components/ui/black-hole-loader";
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay";
import {
  IconArrowLeft,
  IconUsers,
  IconLoader2,
  IconCheck,
  IconAlertCircle
} from "@tabler/icons-react";

interface RoomSettings {
  roomName: string;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  timePerQuestion: number;
  maxParticipants: number;
  isPublic: boolean;
}

export default function CreateRoomPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  const [settings, setSettings] = useState<RoomSettings>({
    roomName: '',
    subject: '',
    topic: '',
    difficulty: 'medium',
    questionCount: 10,
    timePerQuestion: 30,
    maxParticipants: 8,
    isPublic: true
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const handleInputChange = (field: keyof RoomSettings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return settings.roomName.trim().length >= 3;
      case 2:
        return settings.subject.trim().length >= 2 && settings.topic.trim().length >= 2;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  const handleCreateRoom = async () => {
    if (!validateStep(3)) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...settings,
          hostId: user?.uid,
          hostName: user?.displayName || user?.email || 'Anonymous'
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Redirect to the quiz room waiting page
        router.push(`/quiz-room/${data.roomCode}`);
      } else {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          setError(errorData.error || 'Failed to create room');
        } catch {
          setError('Failed to create room - server error');
        }
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsCreating(false);
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

  const difficultyOptions = [
    { value: 'easy', label: 'Easy', desc: '30s per question', color: 'text-green-400' },
    { value: 'medium', label: 'Medium', desc: '25s per question', color: 'text-yellow-400' },
    { value: 'hard', label: 'Hard', desc: '20s per question', color: 'text-red-400' }
  ];

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

        <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-2xl p-8 w-full max-w-2xl">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-neutral-400">Step {step} of 3</span>
              <span className="text-sm text-neutral-400">{Math.round((step / 3) * 100)}%</span>
            </div>
            <div className="w-full bg-neutral-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Step 1: Room Name */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Create Your Quiz Room</h1>
                <p className="text-neutral-400">Let's start with a memorable room name</p>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={settings.roomName}
                  onChange={(e) => handleInputChange('roomName', e.target.value)}
                  placeholder="Enter a creative room name..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  maxLength={50}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-neutral-500">
                    {settings.roomName.length >= 3 ? '✓ Good to go!' : 'Minimum 3 characters'}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {settings.roomName.length}/50
                  </span>
                </div>
              </div>

              <button
                onClick={handleNextStep}
                disabled={!validateStep(1)}
                className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
                  validateStep(1)
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Subject & Topic */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Choose Your Topic</h1>
                <p className="text-neutral-400">What subject would you like to quiz about?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={settings.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    placeholder="e.g., Mathematics, History, Science..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Specific Topic
                  </label>
                  <input
                    type="text"
                    value={settings.topic}
                    onChange={(e) => handleInputChange('topic', e.target.value)}
                    placeholder="e.g., Calculus, World War II, Physics..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePrevStep}
                  className="flex-1 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-all duration-200"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!validateStep(2)}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all duration-200 ${
                    validateStep(2)
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Quiz Settings */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Quiz Settings</h1>
                <p className="text-neutral-400">Customize your quiz competition</p>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-white text-sm font-medium mb-3">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {difficultyOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleInputChange('difficulty', option.value)}
                      className={`p-4 rounded-lg border transition-all duration-200 ${
                        settings.difficulty === option.value
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-white/20 bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      <div className={`font-medium ${option.color}`}>{option.label}</div>
                      <div className="text-sm text-neutral-400 mt-1">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Questions */}
              <div>
                <label className="block text-white text-sm font-medium mb-3">
                  Number of Questions: {settings.questionCount}
                </label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={settings.questionCount}
                  onChange={(e) => handleInputChange('questionCount', parseInt(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-neutral-400 mt-1">
                  <span>5 questions</span>
                  <span>20 questions</span>
                </div>
              </div>

              {/* Max Participants */}
              <div>
                <label className="block text-white text-sm font-medium mb-3">
                  Max Participants: {settings.maxParticipants}
                </label>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={settings.maxParticipants}
                  onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-neutral-400 mt-1">
                  <span>2 players</span>
                  <span>20 players</span>
                </div>
              </div>

              {/* Room Privacy */}
              <div>
                <label className="block text-white text-sm font-medium mb-3">
                  Room Privacy
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleInputChange('isPublic', true)}
                    className={`p-4 rounded-lg border transition-all duration-200 ${
                      settings.isPublic
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-white/20 bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <div className="font-medium text-green-400">Public Room</div>
                    <div className="text-sm text-neutral-400 mt-1">Others can find and join randomly</div>
                  </button>
                  <button
                    onClick={() => handleInputChange('isPublic', false)}
                    className={`p-4 rounded-lg border transition-all duration-200 ${
                      !settings.isPublic
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-white/20 bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <div className="font-medium text-purple-400">Private Room</div>
                    <div className="text-sm text-neutral-400 mt-1">Only accessible with room code</div>
                  </button>
                </div>
              </div>

              {/* Entry Fee Info */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <IconUsers className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 font-medium">Entry Fee: 5 Gyan Coins</span>
                </div>
                <p className="text-neutral-300 text-sm">
                  You and each participant pays 5 Gyan coins to join. Winner takes all!
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePrevStep}
                  className="flex-1 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-all duration-200"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                      Creating Room...
                    </>
                  ) : (
                    <>
                      <IconCheck className="h-4 w-4" />
                      Create Room
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </WavyBackground>
    </div>
  );
}