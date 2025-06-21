"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { FloatingDock } from "@/components/ui/floating-dock";
import { WavyBackground } from "@/components/ui/wavy-background";
import BlackHoleLoader from "@/components/ui/black-hole-loader";
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay";
import {
  IconArrowLeft,
  IconClock,
  IconBrain,
  IconCheck,
  IconX,
  IconRefresh,
  IconBook,
  IconTarget,
  IconChevronRight,
  IconAward,
  IconEdit,
  IconPlus,
  IconMinus,
  IconHistory,
  IconHome,
  IconUsers,
  IconSettings,
  IconLogout,
  IconMap,
  IconList,
} from "@tabler/icons-react";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizData {
  questions: Question[];
  subject: string;
  difficulty: string;
  duration: string;
}

interface QuizHistory {
  _id?: string;
  userId: string;
  subject: string;
  topic: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  difficulty: string;
  duration: string;
  completedAt: Date;
  timeTaken: number;
}

// Subject options with categories
const SUBJECTS = {
  "Science": {
    categories: {
      "Physics": ["Mechanics", "Thermodynamics", "Electricity", "Optics", "Modern Physics"],
      "Chemistry": ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Analytical Chemistry"],
      "Biology": ["Cell Biology", "Genetics", "Ecology", "Human Anatomy", "Evolution"],
      "Mathematics": ["Algebra", "Calculus", "Geometry", "Statistics", "Trigonometry"]
    }
  },
  "Technology": {
    categories: {
      "Programming": ["JavaScript", "Python", "Java", "C++", "React", "Node.js"],
      "Web Development": ["HTML/CSS", "Frontend", "Backend", "Full Stack", "UI/UX"],
      "Data Science": ["Machine Learning", "Data Analysis", "Statistics", "Python", "R"],
      "Cybersecurity": ["Network Security", "Ethical Hacking", "Cryptography", "Security Auditing"]
    }
  },
  "Humanities": {
    categories: {
      "History": ["Ancient History", "Modern History", "World Wars", "Indian History"],
      "Literature": ["English Literature", "Poetry", "Drama", "Fiction", "Literary Analysis"],
      "Philosophy": ["Ethics", "Logic", "Metaphysics", "Political Philosophy"],
      "Geography": ["Physical Geography", "Human Geography", "Climate", "World Geography"]
    }
  },
  "Business": {
    categories: {
      "Management": ["Strategic Management", "HR Management", "Operations", "Leadership"],
      "Marketing": ["Digital Marketing", "Brand Management", "Consumer Behavior", "Sales"],
      "Finance": ["Investment", "Banking", "Accounting", "Economics"],
      "Entrepreneurship": ["Startup", "Business Planning", "Innovation", "Venture Capital"]
    }
  }
};

const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"];
const DURATION_OPTIONS = [
  { value: "10", label: "10 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "20", label: "20 minutes" },
  { value: "30", label: "30 minutes" }
];

const QUESTION_COUNTS = [5, 10, 15, 20, 25];

function QuizGameContent() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Quiz selection state
  const [showSelection, setShowSelection] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [useCustomSubject, setUseCustomSubject] = useState(false);
  const [customSubject, setCustomSubject] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("Medium");
  const [selectedDuration, setSelectedDuration] = useState<string>("15");
  const [questionCount, setQuestionCount] = useState<number>(10);
  
  // Quiz game state
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [gyanDeducted, setGyanDeducted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  
  // History state
  const [quizHistory, setQuizHistory] = useState<QuizHistory[]>([]);

  // Check URL parameters for direct quiz start
  useEffect(() => {
    const subject = searchParams.get('subject');
    const difficulty = searchParams.get('difficulty');
    const duration = searchParams.get('duration');
    
    if (subject && difficulty && duration) {
      setSelectedSubject(subject);
      setSelectedDifficulty(difficulty);
      setSelectedDuration(duration);
      setShowSelection(false);
      if (isAuthenticated && user) {
        startQuiz(subject, difficulty, duration);
      }
    }
  }, [searchParams, isAuthenticated, user]);

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && !quizCompleted && !isLoading) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && quizData && !quizCompleted) {
      completeQuiz();
    }
  }, [timeLeft, quizCompleted, quizData, isLoading]);

  const startQuiz = async (subject: string, difficulty: string, duration: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await deductGyanPoints();
      
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subject, 
          difficulty, 
          duration,
          questionCount 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate quiz');
      }

      const data = await response.json();
      
      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions received from API');
      }
      
      setQuizData(data);
      setTimeLeft(parseInt(duration) * 60);
      setStartTime(Date.now());
      setShowSelection(false);
      
    } catch (error) {
      console.error('Error generating quiz:', error);
      setError(
        `Failed to generate quiz: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      setShowSelection(true);
    } finally {
      setIsLoading(false);
    }
  };

  const deductGyanPoints = async () => {
    if (gyanDeducted || !user) return;
    
    try {
      const response = await fetch('/api/deduct-gyan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid, amount: 5 }),
      });

      if (response.ok) {
        setGyanDeducted(true);
      } else {
        const errorData = await response.json();
        if (errorData.error === 'Insufficient Gyan Points') {
          alert('You need at least 5 Gyan Points to play a quiz!');
          router.back();
          return;
        }
      }
    } catch (error) {
      console.error('Error deducting Gyan Points:', error);
    }
  };

  const saveQuizHistory = async () => {
    if (!user || !quizData) return;

    try {
      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      const percentage = Math.round((score / quizData.questions.length) * 100);
      
      const historyData: Omit<QuizHistory, '_id'> = {
        userId: user.uid,
        subject: useCustomSubject ? customSubject : selectedSubject,
        topic: useCustomSubject ? customTopic : `${selectedCategory} - ${selectedTopic}`,
        score,
        totalQuestions: quizData.questions.length,
        percentage,
        difficulty: selectedDifficulty,
        duration: selectedDuration,
        completedAt: new Date(),
        timeTaken
      };

      const response = await fetch('/api/quiz-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(historyData),
      });

      if (!response.ok) {
        console.error('Failed to save quiz history');
      }
    } catch (error) {
      console.error('Error saving quiz history:', error);
    }
  };

  const loadQuizHistory = async () => {
    if (!user) return;

    try {
      setHistoryLoading(true);
      const response = await fetch(`/api/quiz-history?userId=${user.uid}`);
      
      if (response.ok) {
        const history = await response.json();
        setQuizHistory(history);
      }
    } catch (error) {
      console.error('Error loading quiz history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleStartQuiz = () => {
    let subject = "";
    
    if (useCustomSubject) {
      if (!customSubject.trim() || !customTopic.trim()) {
        alert('Please enter both subject and topic!');
        return;
      }
      subject = `${customSubject.trim()} - ${customTopic.trim()}`;
    } else {
      if (!selectedSubject || !selectedCategory || !selectedTopic) {
        alert('Please select subject, category, and topic!');
        return;
      }
      subject = `${selectedSubject} - ${selectedCategory} - ${selectedTopic}`;
    }
    
    startQuiz(subject, selectedDifficulty, selectedDuration);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answerIndex);
    setIsAnswered(true);
    
    const isCorrect = answerIndex === quizData!.questions[currentQuestion].correctAnswer;
    
    if (isCorrect) {
      setScore(score + 1);
      setStreak(streak + 1);
    } else {
      setStreak(0);
    }
    
    setTimeout(() => {
      setShowExplanation(true);
    }, 500);
  };

  const nextQuestion = () => {
    if (currentQuestion < quizData!.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setShowExplanation(false);
    } else {
      completeQuiz();
    }
  };

  const completeQuiz = async () => {
    setQuizCompleted(true);
    await saveQuizHistory();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const restartQuiz = () => {
    setQuizData(null);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setQuizCompleted(false);
    setShowExplanation(false);
    setGyanDeducted(false);
    setError(null);
    setStreak(0);
    setShowSelection(true);
    setShowHistory(false);
  };

  const showHistoryView = () => {
    setShowSelection(false);
    setShowHistory(true);
    loadQuizHistory();
  };

  const backToSelection = () => {
    setShowHistory(false);
    setShowSelection(true);
  };

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

  // Quiz History Screen
  if (showHistory) {
    return (
      <div className="min-h-screen relative overflow-y-auto">
        <WavyBackground className="min-h-full relative">
          {/* Fixed Header */}
          <div className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm border-b border-white/20">
            <div className="flex items-center justify-between p-3 sm:p-4">
              <button 
                onClick={backToSelection}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200 text-sm sm:text-base"
              >
                <IconArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Back</span>
              </button>
              <GyanPointsDisplay />
            </div>
          </div>

          {/* Main Content */}
          <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 pt-16 sm:pt-20 pb-6 sm:pb-8 min-h-screen">
            <div className="max-w-6xl mx-auto">
              <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
                
                {/* Header */}
                <div className="text-center mb-6 sm:mb-8">
                  <IconHistory className="h-12 w-12 sm:h-16 sm:w-16 text-white mx-auto mb-4" />
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
                    Quiz History
                  </h1>
                  <p className="text-neutral-400 text-sm sm:text-base">Your past quiz performances</p>
                </div>

                {/* History Content */}
                {historyLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-neutral-400">Loading history...</p>
                  </div>
                ) : quizHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <IconBook className="h-16 w-16 text-neutral-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Quiz History</h3>
                    <p className="text-neutral-400 mb-6">You haven't completed any quizzes yet.</p>
                    <button
                      onClick={backToSelection}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                    >
                      Take Your First Quiz
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {quizHistory.map((quiz, index) => (
                      <div
                        key={quiz._id || index}
                        className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6 hover:bg-white/10 transition-all duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-lg mb-1">
                              {quiz.subject}
                            </h3>
                            <p className="text-neutral-300 text-sm mb-2">
                              {quiz.topic}
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                                {quiz.difficulty}
                              </span>
                              <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded">
                                {quiz.duration} min
                              </span>
                              <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                                {quiz.totalQuestions} questions
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:items-end gap-2">
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-white">
                                  {quiz.percentage}%
                                </div>
                                <div className="text-xs text-neutral-400">
                                  {quiz.score}/{quiz.totalQuestions}
                                </div>
                              </div>
                              <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center ${
                                quiz.percentage >= 80 ? 'border-green-500 bg-green-500/10' :
                                quiz.percentage >= 60 ? 'border-yellow-500 bg-yellow-500/10' :
                                'border-red-500 bg-red-500/10'
                              }`}>
                                <span className="text-lg font-bold text-white">
                                  {quiz.percentage >= 80 ? 'A' : quiz.percentage >= 60 ? 'B' : 'C'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="text-xs text-neutral-400 text-right">
                              {new Date(quiz.completedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </WavyBackground>
      </div>
    );
  }

  // Subject Selection Screen
  if (showSelection) {
    return (
      <div className="min-h-screen relative">
        <WavyBackground className="min-h-full relative">
          {/* Fixed Header */}
          <div className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm border-b border-white/20">
            <div className="flex items-center justify-between p-3 sm:p-4">
              <button 
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200 text-sm sm:text-base"
              >
                <IconArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Back</span>
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={showHistoryView}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200 text-sm sm:text-base"
                >
                  <IconHistory className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">History</span>
                </button>
                <GyanPointsDisplay />
              </div>
            </div>
          </div>

          {/* Scrollable Main Content */}
          <div className="fixed inset-0 pt-16 sm:pt-20 pb-4">
            <div className="h-full overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
              <div className="max-w-7xl mx-auto">
                <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
                  
                  {/* Header */}
                  <div className="text-center mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
                      Quiz Setup
                    </h1>
                    <p className="text-neutral-400 text-sm sm:text-base">Configure your quiz preferences</p>
                  </div>

                  {error && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                      <div className="flex items-center gap-2">
                        <IconX className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 flex-shrink-0" />
                        <p className="text-red-400 text-sm sm:text-base">{error}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6 sm:space-y-8">
                    
                    {/* Subject Type Toggle */}
                    <div>
                      <label className="block text-white font-semibold text-base sm:text-lg mb-3 sm:mb-4">
                        Subject Selection Method
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <button
                          onClick={() => setUseCustomSubject(false)}
                          className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                            !useCustomSubject
                              ? 'border-blue-500 bg-blue-500/10 text-white'
                              : 'border-white/20 bg-white/5 text-neutral-300 hover:border-white/40'
                          }`}
                        >
                          <div className="font-medium text-sm sm:text-base">Choose from Categories</div>
                          <div className="text-xs sm:text-sm opacity-75 mt-1">Select from predefined subjects</div>
                        </button>
                        <button
                          onClick={() => setUseCustomSubject(true)}
                          className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                            useCustomSubject
                              ? 'border-blue-500 bg-blue-500/10 text-white'
                              : 'border-white/20 bg-white/5 text-neutral-300 hover:border-white/40'
                          }`}
                        >
                          <div className="font-medium text-sm sm:text-base">Custom Subject</div>
                          <div className="text-xs sm:text-sm opacity-75 mt-1">Enter your own subject</div>
                        </button>
                      </div>
                    </div>

                    {/* Custom Subject Input */}
                    {useCustomSubject ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-white font-semibold text-base sm:text-lg mb-2 sm:mb-3">
                            Subject Name
                          </label>
                          <input
                            type="text"
                            value={customSubject}
                            onChange={(e) => setCustomSubject(e.target.value)}
                            placeholder="e.g., Biology, History, Programming..."
                            className="w-full p-3 sm:p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-neutral-400 focus:border-blue-500 focus:outline-none transition-all duration-200 text-sm sm:text-base"
                          />
                        </div>
                        <div>
                          <label className="block text-white font-semibold text-base sm:text-lg mb-2 sm:mb-3">
                            Topic
                          </label>
                          <input
                            type="text"
                            value={customTopic}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            placeholder="e.g., Cell Biology, World War II, React Hooks..."
                            className="w-full p-3 sm:p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-neutral-400 focus:border-blue-500 focus:outline-none transition-all duration-200 text-sm sm:text-base"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Predefined Subject Selection */}
                        <div>
                          <label className="block text-white font-semibold text-base sm:text-lg mb-3 sm:mb-4">
                            Subject
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                            {Object.keys(SUBJECTS).map((subject) => (
                              <button
                                key={subject}
                                onClick={() => {
                                  setSelectedSubject(subject);
                                  setSelectedCategory("");
                                  setSelectedTopic("");
                                }}
                                className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                                  selectedSubject === subject
                                    ? 'border-blue-500 bg-blue-500/10 text-white'
                                    : 'border-white/20 bg-white/5 text-neutral-300 hover:border-white/40'
                                }`}
                              >
                                <div className="font-medium text-xs sm:text-sm lg:text-base">{subject}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Category Selection */}
                        {selectedSubject && (
                          <div>
                            <label className="block text-white font-semibold text-base sm:text-lg mb-3 sm:mb-4">
                              Category
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                              {Object.keys(SUBJECTS[selectedSubject as keyof typeof SUBJECTS].categories).map((category) => (
                                <button
                                  key={category}
                                  onClick={() => {
                                    setSelectedCategory(category);
                                    setSelectedTopic("");
                                  }}
                                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                                    selectedCategory === category
                                      ? 'border-green-500 bg-green-500/10 text-white'
                                      : 'border-white/20 bg-white/5 text-neutral-300 hover:border-white/40'
                                  }`}
                                >
                                  <div className="font-medium text-xs sm:text-sm lg:text-base">{category}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Topic Selection */}
                        {selectedSubject && selectedCategory && (
                          <div>
                            <label className="block text-white font-semibold text-base sm:text-lg mb-3 sm:mb-4">
                              Topic
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                              {selectedSubject && selectedCategory &&
                                (
                                  (SUBJECTS[selectedSubject as keyof typeof SUBJECTS].categories as Record<string, string[]>)[selectedCategory]
                                )?.map((topic: string) => (
                                <button
                                  key={topic}
                                  onClick={() => setSelectedTopic(topic)}
                                  className={`p-2 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                                    selectedTopic === topic
                                      ? 'border-purple-500 bg-purple-500/10 text-white'
                                      : 'border-white/20 bg-white/5 text-neutral-300 hover:border-white/40'
                                  }`}
                                >
                                  <div className="font-medium text-xs sm:text-sm">{topic}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Quiz Settings Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                      
                      {/* Question Count */}
                      <div>
                        <label className="block text-white font-semibold text-base sm:text-lg mb-2 sm:mb-3">
                          Questions
                        </label>
                        <div className="space-y-2">
                          {QUESTION_COUNTS.map((count) => (
                            <button
                              key={count}
                              onClick={() => setQuestionCount(count)}
                              className={`w-full p-2 sm:p-3 rounded-lg border-2 transition-all duration-200 text-xs sm:text-sm ${
                                questionCount === count
                                  ? 'border-orange-500 bg-orange-500/10 text-white'
                                  : 'border-white/20 bg-white/5 text-neutral-300 hover:border-white/40'
                              }`}
                            >
                              {count} questions
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Difficulty */}
                      <div>
                        <label className="block text-white font-semibold text-base sm:text-lg mb-2 sm:mb-3">
                          Difficulty
                        </label>
                        <div className="space-y-2">
                          {DIFFICULTY_LEVELS.map((level) => (
                            <button
                              key={level}
                              onClick={() => setSelectedDifficulty(level)}
                              className={`w-full p-2 sm:p-3 rounded-lg border-2 transition-all duration-200 text-xs sm:text-sm ${
                                selectedDifficulty === level
                                  ? 'border-yellow-500 bg-yellow-500/10 text-white'
                                  : 'border-white/20 bg-white/5 text-neutral-300 hover:border-white/40'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="block text-white font-semibold text-base sm:text-lg mb-2 sm:mb-3">
                          Duration
                        </label>
                        <div className="space-y-2">
                          {DURATION_OPTIONS.map((duration) => (
                            <button
                              key={duration.value}
                              onClick={() => setSelectedDuration(duration.value)}
                              className={`w-full p-2 sm:p-3 rounded-lg border-2 transition-all duration-200 text-xs sm:text-sm ${
                                selectedDuration === duration.value
                                  ? 'border-blue-500 bg-blue-500/10 text-white'
                                  : 'border-white/20 bg-white/5 text-neutral-300 hover:border-white/40'
                              }`}
                            >
                              {duration.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cost Display */}
                      <div>
                        <label className="block text-white font-semibold text-base sm:text-lg mb-2 sm:mb-3">
                          Cost
                        </label>
                        <div className="bg-neutral-800/50 border border-white/20 rounded-lg p-3 sm:p-4 text-center">
                          <div className="text-xl sm:text-2xl font-bold text-white mb-1">5</div>
                          <div className="text-xs sm:text-sm text-neutral-400">Gyan Points</div>
                        </div>
                      </div>
                    </div>

                    {/* Start Quiz Button */}
                    <div className="text-center pt-4 sm:pt-6">
                      <button
                        onClick={handleStartQuiz}
                        disabled={
                          (!useCustomSubject && (!selectedSubject || !selectedCategory || !selectedTopic)) ||
                          (useCustomSubject && (!customSubject.trim() || !customTopic.trim())) ||
                          isLoading
                        }
                        className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-sm sm:text-lg transition-all duration-200 ${
                          ((!useCustomSubject && selectedSubject && selectedCategory && selectedTopic) ||
                           (useCustomSubject && customSubject.trim() && customTopic.trim())) && !isLoading
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
                        }`}
                      >
                        {isLoading ? 'Generating Quiz...' : 'Start Quiz'}
                      </button>
                    </div>

                    {/* Preview */}
                    {((useCustomSubject && customSubject.trim() && customTopic.trim()) ||
                      (!useCustomSubject && selectedSubject && selectedCategory && selectedTopic)) && (
                      <div className="bg-neutral-800/30 border border-white/20 rounded-lg p-3 sm:p-4 text-center">
                        <h4 className="text-white font-semibold mb-2 text-sm sm:text-base">Quiz Preview</h4>
                        <div className="text-neutral-300 mb-2 text-xs sm:text-sm">
                          {useCustomSubject 
                            ? `${customSubject} - ${customTopic}`
                            : `${selectedSubject} → ${selectedCategory} → ${selectedTopic}`
                          }
                        </div>
                        <div className="text-xs sm:text-sm text-neutral-400 flex flex-wrap justify-center gap-2 sm:gap-4">
                          <span>{questionCount} questions</span>
                          <span>•</span>
                          <span>{selectedDifficulty}</span>
                          <span>•</span>
                          <span>{selectedDuration} minutes</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </WavyBackground>
      </div>
    );
  }

  // Rest of the component remains the same...
  // (Loading, Error, Quiz Game, Completion screens)
  
  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen relative">
        <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-8 relative">
          <div className="fixed top-3 sm:top-4 right-3 sm:right-4 z-50">
            <GyanPointsDisplay />
          </div>
          
          <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-8 max-w-2xl w-full text-center mx-3">
            <BlackHoleLoader />
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mt-6 sm:mt-8 mb-4 sm:mb-6">Generating Your Quiz</h2>
            
            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 text-left">
              <div className="bg-white/10 rounded-lg p-2 sm:p-3 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-neutral-300 text-sm sm:text-base">Subject:</span>
                <span className="text-white font-medium text-sm sm:text-base break-words">
                  {useCustomSubject ? customSubject : selectedSubject}
                </span>
              </div>
              <div className="bg-white/10 rounded-lg p-2 sm:p-3 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                <span className="text-neutral-300 text-sm sm:text-base">Topic:</span>
                <span className="text-white font-medium text-sm sm:text-base break-words">
                  {useCustomSubject ? customTopic : selectedTopic}
                </span>
              </div>
              <div className="bg-white/10 rounded-lg p-2 sm:p-3 flex justify-between">
                <span className="text-neutral-300 text-sm sm:text-base">Questions:</span>
                <span className="text-white font-medium text-sm sm:text-base">{questionCount}</span>
              </div>
              <div className="bg-white/10 rounded-lg p-2 sm:p-3 flex justify-between">
                <span className="text-neutral-300 text-sm sm:text-base">Difficulty:</span>
                <span className="text-white font-medium text-sm sm:text-base">{selectedDifficulty}</span>
              </div>
              <div className="bg-white/10 rounded-lg p-2 sm:p-3 flex justify-between">
                <span className="text-neutral-300 text-sm sm:text-base">Duration:</span>
                <span className="text-white font-medium text-sm sm:text-base">{selectedDuration} minutes</span>
              </div>
            </div>
            
            <div className="text-neutral-400 text-sm sm:text-base">
              Please wait while we prepare your personalized quiz...
            </div>
          </div>
        </WavyBackground>
      </div>
    );
  }

  // Error State
  if (error && !showSelection) {
    return (
      <div className="min-h-screen relative">
        <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-8 relative">
          <div className="fixed top-3 sm:top-4 right-3 sm:right-4 z-50">
            <GyanPointsDisplay />
          </div>
          
          <div className="bg-black/50 backdrop-blur-sm border border-red-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-8 max-w-2xl w-full text-center mx-3">
            <IconX className="h-12 w-12 sm:h-16 sm:w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Quiz Generation Failed</h2>
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <p className="text-red-400 text-sm sm:text-base break-words">{error}</p>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <button 
                onClick={restartQuiz}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 text-sm sm:text-base"
              >
                <IconRefresh className="h-3 w-3 sm:h-4 sm:w-4 inline mr-2" />
                Try Again
              </button>
              <button 
                onClick={() => setShowSelection(true)}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 border border-white/20 text-sm sm:text-base"
              >
                Choose Different Topic
              </button>
            </div>
          </div>
        </WavyBackground>
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-white text-center">
          <h2 className="text-xl sm:text-2xl mb-4">No quiz data available</h2>
          <button 
            onClick={() => setShowSelection(true)}
            className="px-4 sm:px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm sm:text-base"
          >
            Start New Quiz
          </button>
        </div>
      </div>
    );
  }

  // Quiz Completion Screen
  if (quizCompleted) {
    const percentage = Math.round((score / quizData.questions.length) * 100);
    
    return (
      <div className="min-h-screen relative">
        <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 md:p-8 relative">
          <div className="fixed top-3 sm:top-4 right-3 sm:right-4 z-50">
            <GyanPointsDisplay />
          </div>
          
          <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 max-w-4xl w-full text-center mx-3">
            
            <div className="mb-6 sm:mb-8">
              <IconAward className="h-12 w-12 sm:h-16 sm:w-16 text-white mx-auto mb-4" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
                Quiz Completed
              </h1>
              
              <div className="text-4xl sm:text-6xl md:text-8xl font-bold text-white mb-4">
                {percentage}%
              </div>
              
              <div className="w-full bg-white/20 rounded-full h-2 sm:h-3 mb-4 sm:mb-6">
                <div 
                  className="bg-blue-500 h-2 sm:h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
              <div className="bg-white/10 rounded-lg p-3 sm:p-4">
                <IconCheck className="h-4 w-4 sm:h-6 sm:w-6 text-green-400 mx-auto mb-2" />
                <div className="text-lg sm:text-xl font-bold text-white">{score}</div>
                <div className="text-neutral-400 text-xs sm:text-sm">Correct</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 sm:p-4">
                <IconX className="h-4 w-4 sm:h-6 sm:w-6 text-red-400 mx-auto mb-2" />
                <div className="text-lg sm:text-xl font-bold text-white">{quizData.questions.length - score}</div>
                <div className="text-neutral-400 text-xs sm:text-sm">Incorrect</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 sm:p-4">
                <IconClock className="h-4 w-4 sm:h-6 sm:w-6 text-blue-400 mx-auto mb-2" />
                <div className="text-lg sm:text-xl font-bold text-white">{selectedDuration}</div>
                <div className="text-neutral-400 text-xs sm:text-sm">Minutes</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 sm:p-4">
                <IconTarget className="h-4 w-4 sm:h-6 sm:w-6 text-purple-400 mx-auto mb-2" />
                <div className="text-lg sm:text-xl font-bold text-white">
                  {percentage >= 80 ? 'A' : percentage >= 60 ? 'B' : 'C'}
                </div>
                <div className="text-neutral-400 text-xs sm:text-sm">Grade</div>
              </div>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={restartQuiz}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-lg transition-all duration-200 text-sm sm:text-base"
              >
                Take Another Quiz
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-lg transition-all duration-200 border border-white/20 text-sm sm:text-base"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </WavyBackground>
      </div>
    );
  }

  const currentQ = quizData.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizData.questions.length) * 100;

  return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 md:p-8 relative">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm border-b border-white/20">
          <div className="flex items-center justify-between max-w-7xl mx-auto p-3 sm:p-4">
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to exit the quiz? Your progress will be lost.')) {
                  setShowSelection(true);
                }
              }}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200 text-sm sm:text-base"
            >
              <IconArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Exit</span>
            </button>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 text-white bg-white/10 px-2 sm:px-3 py-1 rounded-lg">
                <IconBrain className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm max-w-32 sm:max-w-none truncate">
                  {useCustomSubject ? customTopic : selectedTopic}
                </span>
              </div>
              
              <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm ${
                timeLeft < 60 ? 'bg-red-900/30 text-red-400' : 
                timeLeft < 300 ? 'bg-yellow-900/30 text-yellow-400' : 
                'bg-white/10 text-white'
              }`}>
                <IconClock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="font-mono font-semibold">
                  {formatTime(timeLeft)}
                </span>
              </div>
              
              <GyanPointsDisplay />
            </div>
          </div>
        </div>

        <div className="min-h-screen flex flex-col items-center justify-center relative z-10 max-w-5xl w-full pt-16 sm:pt-20">
          
          {/* Progress Bar */}
          <div className="w-full mb-6 sm:mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-neutral-400 text-xs sm:text-sm">Progress</span>
              <span className="text-white text-xs sm:text-sm font-semibold">
                {currentQuestion + 1} / {quizData.questions.length}
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5 sm:h-2">
              <div 
                className="bg-blue-500 h-1.5 sm:h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="bg-black/50 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 w-full">
            
            {/* Question Counter */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-white/20">
                <span className="text-neutral-400 text-xs sm:text-sm">
                  Question {currentQuestion + 1}
                </span>
              </div>
            </div>

            {/* Question */}
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-white leading-relaxed px-2">
                {currentQ.question}
              </h2>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-6 sm:mb-8">
              {currentQ.options.map((option, index) => {
                let buttonClass = "w-full p-3 sm:p-4 text-left rounded-lg border-2 transition-all duration-200 ";
                
                if (!isAnswered) {
                  buttonClass += "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10 text-white cursor-pointer";
                } else {
                  if (index === currentQ.correctAnswer) {
                    buttonClass += "border-green-500 bg-green-500/10 text-green-400";
                  } else if (index === selectedAnswer) {
                    buttonClass += "border-red-500 bg-red-500/10 text-red-400";
                  } else {
                    buttonClass += "border-white/20 bg-white/5 text-neutral-400 opacity-60";
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={isAnswered}
                    className={buttonClass}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-current flex items-center justify-center font-semibold text-xs sm:text-sm flex-shrink-0">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="flex-1 font-medium text-sm sm:text-base">{option}</span>
                      <div className="ml-auto flex-shrink-0">
                        {isAnswered && index === currentQ.correctAnswer && (
                          <IconCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                        )}
                        {isAnswered && index === selectedAnswer && index !== currentQ.correctAnswer && (
                          <IconX className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <IconBook className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 flex-shrink-0" />
                  <h4 className="text-blue-400 font-semibold text-sm sm:text-base">Explanation</h4>
                </div>
                <p className="text-neutral-300 leading-relaxed text-sm sm:text-base">{currentQ.explanation}</p>
              </div>
            )}

            {/* Next Button */}
            {isAnswered && (
              <div className="text-center space-y-3 sm:space-y-4">
                <button
                  onClick={nextQuestion}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3 mx-auto text-sm sm:text-base"
                >
                  <span>
                    {currentQuestion < quizData.questions.length - 1 ? 'Next Question' : 'Complete Quiz'}
                  </span>
                  <IconChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                
                <div className="text-xs sm:text-sm text-neutral-400">
                  {currentQuestion < quizData.questions.length - 1 
                    ? `${quizData.questions.length - currentQuestion - 1} questions remaining`
                    : 'Final question!'
                  }
                </div>
              </div>
            )}

            {/* Score Display */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/20">
              <div className="flex items-center gap-2 bg-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
                <IconAward className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                <span className="text-white font-semibold text-xs sm:text-sm">
                  Score: {score}/{quizData.questions.length}
                </span>
              </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
                <IconTarget className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                <span className="text-white font-semibold text-xs sm:text-sm">
                  {Math.round((score / (currentQuestion + (isAnswered ? 1 : 0))) * 100) || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Dock positioned like macOS taskbar */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <FloatingDock
            mobileClassName="translate-y-20"
            items={dockLinks}
            activeItem="/solo-quiz"
          />
        </div>
      </WavyBackground>
    </div>
  );
}

export default function QuizGame() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <BlackHoleLoader />
      </div>
    }>
      <QuizGameContent />
    </Suspense>
  );
}