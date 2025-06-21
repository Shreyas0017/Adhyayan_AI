"use client";
import React, { useState, useEffect, use, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { WavyBackground } from "@/components/ui/wavy-background";
import BlackHoleLoader from "@/components/ui/black-hole-loader";
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay";
import { 
  IconUsers, 
  IconCrown, 
  IconClock, 
  IconTrophy, 
  IconMedal,
  IconCopy,
  IconCheck,
  IconX,
  IconLoader2
} from "@tabler/icons-react";

interface QuizRoomProps {
  params: Promise<{ roomCode: string }>;
}

// Memoized components for better performance
const ParticipantsList = React.memo(({ participants, hostId, status }: any) => (
  <div className="space-y-2">
    {participants.map((participant: any) => (
      <div key={participant.userId} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
        <div className="flex items-center gap-2">
          {participant.userId === hostId && (
            <IconCrown className="h-4 w-4 text-yellow-400" />
          )}
          <span className="text-white text-sm">{participant.userName}</span>
          {participant.isReady && (
            <span className="text-green-400 text-xs">Ready</span>
          )}
        </div>
        {status === 'active' && (
          <div className="text-xs text-neutral-400">
            {participant.isFinished ? (
              <span className="text-green-400">✓ Done</span>
            ) : (
              <span>Q{(participant.currentQuestionIndex || 0) + 1}</span>
            )}
          </div>
        )}
      </div>
    ))}
  </div>
));

const QuestionOption = React.memo(({ 
  option, 
  index, 
  selectedAnswer, 
  answered, 
  showExplanation, 
  correctAnswer,
  onSelect,
  disabled
}: any) => {
  const buttonClass = useMemo(() => {
    let className = "w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ";
    
    if (answered && showExplanation) {
      if (index === correctAnswer) {
        className += "border-green-500 bg-green-500/20 text-green-400";
      } else if (index === selectedAnswer && selectedAnswer !== correctAnswer) {
        className += "border-red-500 bg-red-500/20 text-red-400";
      } else {
        className += "border-white/10 bg-white/5 text-neutral-400";
      }
    } else {
      if (selectedAnswer === index) {
        className += "border-blue-500 bg-blue-500/20 text-white scale-[0.98]";
      } else {
        className += "border-white/20 bg-white/5 text-neutral-300 hover:border-white/40 hover:bg-white/10";
      }
    }
    return className;
  }, [answered, showExplanation, index, correctAnswer, selectedAnswer]);

  return (
    <button
      onClick={() => onSelect(index)}
      disabled={disabled}
      className={buttonClass}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center font-bold text-sm">
          {String.fromCharCode(65 + index)}
        </div>
        <span className="flex-1">{option}</span>
        {answered && showExplanation && index === correctAnswer && (
          <IconCheck className="h-5 w-5 text-green-400" />
        )}
        {answered && showExplanation && index === selectedAnswer && selectedAnswer !== correctAnswer && (
          <IconX className="h-5 w-5 text-red-400" />
        )}
      </div>
    </button>
  );
});

export default function QuizRoom({ params }: QuizRoomProps) {
  const resolvedParams = use(params);
  const { roomCode } = resolvedParams;
  
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  
  // Consolidated state for better performance
  const [gameState, setGameState] = useState({
    roomState: null as any,
    currentQuestion: null as any,
    currentParticipant: null as any,
    selectedAnswer: -1,
    timeLeft: 0,
    quizPhase: 'waiting' as 'waiting' | 'quiz' | 'finished' | 'results',
    answered: false,
    showExplanation: false,
    results: null as any,
    copied: false,
    isSubmitting: false,
    currentQuestionIndex: -1
  });

  // Refs for timers and tracking
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTimeRef = useRef<number>(0);
  const lastFetchRef = useRef<number>(0);
  const isInitializedRef = useRef(false);

  // Memoized values
  const isHost = useMemo(() => 
    gameState.roomState?.hostId === user?.uid, 
    [gameState.roomState?.hostId, user?.uid]
  );

  // Optimized fetch function with debouncing
  const fetchRoomState = useCallback(async () => {
    const now = Date.now();
    // Debounce API calls - minimum 1 second between calls
    if (now - lastFetchRef.current < 1000) return;
    lastFetchRef.current = now;

    try {
      const response = await fetch(`/api/rooms/${roomCode}/state?userId=${user?.uid}`);
      if (!response.ok) return;
      
      const data = await response.json();
      
      setGameState(prev => {
        const newState = { ...prev };
        newState.roomState = data.room;
        newState.currentParticipant = data.currentParticipant;
        
        // Only update if there's a real change
        if (data.room.status === 'active' && data.currentQuestion && data.currentParticipant && !data.currentParticipant.isFinished) {
          const newQuestionIndex = data.currentParticipant.currentQuestionIndex;
          
          // New question detected
          if (prev.currentQuestionIndex !== newQuestionIndex) {
            newState.currentQuestion = data.currentQuestion;
            newState.currentQuestionIndex = newQuestionIndex;
            newState.quizPhase = 'quiz';
            newState.timeLeft = data.room.settings?.timePerQuestion || 30;
            newState.answered = false;
            newState.selectedAnswer = -1;
            newState.showExplanation = false;
            newState.isSubmitting = false;
            questionStartTimeRef.current = Date.now();
          }
        } else if (data.room.status === 'active' && data.currentParticipant && data.currentParticipant.isFinished) {
          newState.quizPhase = 'finished';
        } else if (data.room.status === 'completed') {
          newState.results = data.results;
          newState.quizPhase = 'results';
        }
        
        return newState;
      });
    } catch (error) {
      console.error('Error fetching room state:', error);
    }
  }, [roomCode, user?.uid]);

  // Optimized timer management
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (gameState.timeLeft > 0 && gameState.quizPhase === 'quiz' && !gameState.answered && !gameState.isSubmitting) {
      timerRef.current = setTimeout(() => {
        setGameState(prev => {
          const newTime = prev.timeLeft - 1;
          if (newTime <= 0 && prev.currentQuestion && !prev.answered && !prev.isSubmitting) {
            // Auto-submit
            submitAnswer(-1);
          }
          return { ...prev, timeLeft: newTime };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [gameState.timeLeft, gameState.quizPhase, gameState.answered, gameState.isSubmitting]);

  // Initialize with optimized polling
  useEffect(() => {
    if (!isAuthenticated || !roomCode || !user || isInitializedRef.current) return;
    
    fetchRoomState();
    isInitializedRef.current = true;
    
    // Adaptive polling - slower when not in active quiz
    const startPolling = () => {
      const getPollingInterval = () => {
        if (gameState.quizPhase === 'quiz') return 1500; // Fast during quiz
        if (gameState.quizPhase === 'waiting') return 3000; // Medium during waiting
        return 5000; // Slow for results
      };

      pollingRef.current = setInterval(fetchRoomState, getPollingInterval());
    };

    startPolling();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isAuthenticated, roomCode, user, fetchRoomState]);

  // Optimized answer selection
  const handleAnswerSelect = useCallback((index: number) => {
    if (gameState.answered || gameState.isSubmitting) return;
    
    setGameState(prev => ({
      ...prev,
      selectedAnswer: index
    }));
  }, [gameState.answered, gameState.isSubmitting]);

  // Optimized answer submission
  const submitAnswer = useCallback(async (answerIndex: number = gameState.selectedAnswer) => {
    if (!gameState.currentQuestion || gameState.answered || !gameState.currentParticipant || gameState.isSubmitting) {
      return;
    }
    
    setGameState(prev => ({
      ...prev,
      isSubmitting: true,
      answered: true
    }));

    const responseTime = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    
    try {
      const response = await fetch(`/api/rooms/${roomCode}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          questionIndex: gameState.currentParticipant.currentQuestionIndex,
          answer: answerIndex,
          responseTime: responseTime,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        
        setGameState(prev => ({
          ...prev,
          showExplanation: true
        }));
        
        // Quick transition
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            showExplanation: false,
            isSubmitting: false,
            quizPhase: result.isFinished ? 'finished' : prev.quizPhase
          }));
          
          if (!result.isFinished) {
            fetchRoomState();
          }
        }, 1500); // Reduced to 1.5 seconds
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setGameState(prev => ({
        ...prev,
        answered: false,
        isSubmitting: false
      }));
    }
  }, [gameState, roomCode, user?.uid, fetchRoomState]);

  // Optimized room operations
  const startQuiz = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${roomCode}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        setGameState(prev => ({ ...prev, currentQuestionIndex: -1 }));
        fetchRoomState();
      }
    } catch (error) {
      console.error('Error starting quiz:', error);
    }
  }, [roomCode, fetchRoomState]);

  const copyRoomLink = useCallback(() => {
    const roomLink = `${window.location.origin}/join-room/${roomCode}`;
    navigator.clipboard.writeText(roomLink);
    setGameState(prev => ({ ...prev, copied: true }));
    setTimeout(() => {
      setGameState(prev => ({ ...prev, copied: false }));
    }, 2000);
  }, [roomCode]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Loading states
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

  if (!gameState.roomState) {
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

        <div className="max-w-4xl w-full mx-auto">
          {/* Waiting Phase */}
          {gameState.quizPhase === 'waiting' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-6 mb-6">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    {gameState.roomState.roomName}
                  </h2>
                  <div className="grid grid-cols-2 gap-4 text-sm text-neutral-400 mb-6">
                    <div>Subject: <span className="text-white">{gameState.roomState.subject}</span></div>
                    <div>Topic: <span className="text-white">{gameState.roomState.topic}</span></div>
                    <div>Difficulty: <span className="text-white">{gameState.roomState.difficulty}</span></div>
                    <div>Questions: <span className="text-white">{gameState.roomState.settings?.questionCount}</span></div>
                    <div>Time Limit: <span className="text-white">{gameState.roomState.settings?.timePerQuestion}s per question</span></div>
                    <div>Prize Pool: <span className="text-white">{gameState.roomState.prizePool} coins</span></div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-lg font-mono text-white">{roomCode}</div>
                      <div className="text-xs text-neutral-400">Room Code</div>
                    </div>
                    <button
                      onClick={copyRoomLink}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-all duration-300"
                    >
                      {gameState.copied ? <IconCheck className="h-4 w-4" /> : <IconCopy className="h-4 w-4" />}
                      {gameState.copied ? 'Copied!' : 'Share'}
                    </button>
                  </div>
                </div>

                {isHost && (
                  <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-6">
                    <p className="text-neutral-400 mb-4">
                      🤖 AI questions generated and ready. Waiting for participants...
                    </p>
                    <button
                      onClick={startQuiz}
                      disabled={gameState.roomState.participants.length < 2}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all duration-300"
                    >
                      Start Quiz
                    </button>
                    {gameState.roomState.participants.length < 2 && (
                      <p className="text-sm text-yellow-400 mt-2">
                        Need at least 2 participants to start
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <IconUsers className="h-5 w-5 text-white" />
                  <h3 className="text-lg font-semibold text-white">
                    Participants ({gameState.roomState.participants.length})
                  </h3>
                </div>
                
                <ParticipantsList 
                  participants={gameState.roomState.participants}
                  hostId={gameState.roomState.hostId}
                  status={gameState.roomState.status}
                />
              </div>
            </div>
          )}

          {/* Quiz Phase */}
          {gameState.quizPhase === 'quiz' && gameState.currentQuestion && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-8">
                {/* Question Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="text-sm text-neutral-400">
                    Question {gameState.currentQuestion.questionNumber} of {gameState.currentQuestion.totalQuestions}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-neutral-400">
                      Score: {gameState.currentParticipant?.score || 0}
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                      gameState.timeLeft <= 10 ? 'bg-red-500/20 text-red-400 animate-pulse' : 
                      gameState.timeLeft <= 20 ? 'bg-yellow-500/20 text-yellow-400' : 
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      <IconClock className="h-4 w-4" />
                      <span className="font-mono font-bold">{gameState.timeLeft}s</span>
                    </div>
                  </div>
                </div>

                {/* Question */}
                <h3 className="text-xl font-semibold text-white mb-6">
                  {gameState.currentQuestion.question}
                </h3>

                {/* Options */}
                <div className="space-y-3 mb-6">
                  {gameState.currentQuestion.options.map((option: string, index: number) => (
                    <QuestionOption
                      key={index}
                      option={option}
                      index={index}
                      selectedAnswer={gameState.selectedAnswer}
                      answered={gameState.answered}
                      showExplanation={gameState.showExplanation}
                      correctAnswer={gameState.currentQuestion.correctAnswer}
                      onSelect={handleAnswerSelect}
                      disabled={gameState.answered || gameState.isSubmitting}
                    />
                  ))}
                </div>

                {/* Submit Button */}
                <button
                  onClick={() => submitAnswer()}
                  disabled={gameState.selectedAnswer === -1 || gameState.answered || gameState.isSubmitting}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-300 ${
                    gameState.selectedAnswer === -1 || gameState.answered || gameState.isSubmitting
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {gameState.isSubmitting ? 'Submitting...' : 
                   gameState.answered ? 'Answer Submitted ✓' : 
                   gameState.selectedAnswer === -1 ? 'Select an Answer' : 'Submit Answer'}
                </button>

                {/* Explanation */}
                {gameState.showExplanation && gameState.currentQuestion.explanation && (
                  <div className="mt-6 bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                    <h4 className="text-blue-400 font-semibold mb-2">💡 Explanation</h4>
                    <p className="text-blue-100 text-sm">{gameState.currentQuestion.explanation}</p>
                    <div className="mt-3 text-xs text-blue-300">
                      Moving to next question...
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Finished Phase */}
          {gameState.quizPhase === 'finished' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                  <IconCheck className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  Quiz Completed! 🎉
                </h2>
                <div className="bg-white/10 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-white">{gameState.currentParticipant?.score || 0}</div>
                      <div className="text-xs text-neutral-400">Total Score</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-400">{gameState.currentParticipant?.correctAnswers || 0}</div>
                      <div className="text-xs text-neutral-400">Correct</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-400">{gameState.currentParticipant?.averageResponseTime?.toFixed(1) || 0}s</div>
                      <div className="text-xs text-neutral-400">Avg Time</div>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-center gap-2 text-yellow-400">
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                    <span>Waiting for other players to finish...</span>
                  </div>
                </div>
                <div className="text-sm text-neutral-500">
                  Results will be shown when all players complete the quiz
                </div>
              </div>
            </div>
          )}

          {/* Results Phase */}
          {gameState.quizPhase === 'results' && gameState.results && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-8">
                <h2 className="text-3xl font-bold text-white mb-8 text-center">
                  🏆 Final Results
                </h2>

                <div className="space-y-4 mb-8">
                  {gameState.results.leaderboard.map((participant: any, index: number) => (
                    <div
                      key={participant.userId}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        index === 0 
                          ? 'bg-yellow-500/20 border-yellow-500/50' 
                          : index === 1
                          ? 'bg-gray-400/20 border-gray-400/50'
                          : index === 2
                          ? 'bg-orange-500/20 border-orange-500/50'
                          : 'bg-white/5 border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className={`text-2xl font-bold ${
                            index === 0 ? 'text-yellow-400' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-orange-400' :
                            'text-white'
                          }`}>
                            #{index + 1}
                          </div>
                          {index === 0 && <IconTrophy className="h-6 w-6 text-yellow-400" />}
                          {index === 1 && <IconMedal className="h-6 w-6 text-gray-400" />}
                          {index === 2 && <IconMedal className="h-6 w-6 text-orange-400" />}
                        </div>
                        <div>
                          <div className="text-white font-semibold text-lg">{participant.userName}</div>
                          <div className="text-neutral-400 text-sm">
                            Avg Response: {participant.averageResponseTime.toFixed(1)}s
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-xl">{participant.score} pts</div>
                        <div className="text-neutral-400 text-sm">
                          {participant.correctAnswers}/{gameState.roomState.settings?.questionCount} correct
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {gameState.results.winner && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6 mb-6">
                    <p className="text-green-200 text-center text-lg">
                      🎉 <strong>{gameState.results.winner.userName}</strong> wins <strong>{gameState.results.totalPrize} Gyan Coins!</strong>
                    </p>
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => router.push('/create-room')}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300"
                  >
                    Back to Rooms
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </WavyBackground>
    </div>
  );
}