"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardBody, Button, Input, Chip } from "@heroui/react"
import { WavyBackground } from "@/components/ui/wavy-background"
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay"
import { FloatingDock } from "@/components/ui/floating-dock"
import toast from "react-hot-toast"
import {
  IconArrowLeft,
  IconBrain,
  IconHistory,
  IconTrash,
  IconEye,
  IconPlus,
  IconCards,
  IconRefresh,
  IconFlipVertical,
  IconStar,
  IconCheck,
  IconHome,
  IconUsers,
  IconSettings,
  IconLogout,
  IconMap,
  IconList,
} from "@tabler/icons-react"

interface Flashcard {
  id: string
  question: string
  answer: string
}

interface FlashcardSet {
  id: string
  topic: string
  flashcards: Flashcard[]
  createdAt: string
  count: number
}

export default function FlashcardPage() {
  const { user, loading, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const [topic, setTopic] = useState("")
  const [count, setCount] = useState(15)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentFlashcards, setCurrentFlashcards] = useState<Flashcard[]>([])
  const [history, setHistory] = useState<FlashcardSet[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null)
  const [selectedCardIndex, setSelectedCardIndex] = useState(0)
  const [completedCards, setCompletedCards] = useState<Set<number>>(new Set())

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
    },    {
      title: "Flash Cards",
      icon: (
        <IconList className="h-full w-full text-red-400 dark:text-red-400" />
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

  // Load history from localStorage on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedHistory = localStorage.getItem("flashcard-history")
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory))
        } catch (error) {
          console.error("Error loading flashcard history:", error)
        }
      }
    }
  }, [])

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined" && history.length > 0) {
      localStorage.setItem("flashcard-history", JSON.stringify(history))
    }
  }, [history])

  // Reset selected card and completed cards when flashcards change
  useEffect(() => {
    setSelectedCardIndex(0)
    setCompletedCards(new Set())
  }, [currentFlashcards])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <div
            className="absolute inset-0 w-16 h-16 border-4 border-pink-500/30 border-b-pink-500 rounded-full animate-spin"
            style={{ animationDirection: "reverse" }}
          ></div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    router.push("/")
    return null
  }

  const generateFlashcards = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic")
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic: topic.trim(), count }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate flashcards")
      }

      const newFlashcardSet: FlashcardSet = {
        id: `set-${Date.now()}`,
        topic: topic.trim(),
        flashcards: data.flashcards,
        createdAt: new Date().toISOString(),
        count: data.flashcards.length,
      }

      setCurrentFlashcards(data.flashcards)
      setHistory((prev) => [newFlashcardSet, ...prev])
      setSelectedSet(newFlashcardSet)
      toast.success(`Generated ${data.flashcards.length} flashcards!`)
    } catch (error) {
      console.error("Error generating flashcards:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate flashcards")
    } finally {
      setIsGenerating(false)
    }
  }

  const deleteFromHistory = (setId: string) => {
    setHistory((prev) => prev.filter((set) => set.id !== setId))
    if (selectedSet?.id === setId) {
      setSelectedSet(null)
      setCurrentFlashcards([])
    }
    toast.success("Flashcard set deleted")
  }

  const viewFlashcardSet = (set: FlashcardSet) => {
    setSelectedSet(set)
    setCurrentFlashcards(set.flashcards)
    setShowHistory(false)
  }

  const clearAllHistory = () => {
    if (confirm("Are you sure you want to clear all flashcard history?")) {
      setHistory([])
      setCurrentFlashcards([])
      setSelectedSet(null)
      if (typeof window !== "undefined") {
        localStorage.removeItem("flashcard-history")
      }
      toast.success("History cleared")
    }
  }

  const markCardAsCompleted = (index: number) => {
    setCompletedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <WavyBackground className="min-h-screen">
        {/* Gyan Points Display */}
        <div className="fixed top-4 right-4 z-50">
          <GyanPointsDisplay />
        </div>

        {/* Main Container */}
        <div className="container mx-auto px-4 py-6 max-w-7xl relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                isIconOnly
                variant="ghost"
                onClick={() => router.push("/dashboard")}
                className="text-white hover:bg-white/10 transition-all duration-200 hover:scale-105"
                size="lg"
              >
                <IconArrowLeft className="w-6 h-6" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl backdrop-blur-sm border border-white/10">
                  <IconCards className="w-8 h-8 text-white" />
                </div>
                <div>                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Flashcards
                  </h1>
                  <p className="text-white/70 text-sm md:text-base">AI-powered learning cards</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant={showHistory ? "solid" : "ghost"}
                onClick={() => setShowHistory(!showHistory)}
                className={
                  showHistory
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                    : "text-white hover:bg-white/10 border border-white/20"
                }
                startContent={<IconHistory className="w-4 h-4" />}
                size="lg"
              >
                History ({history.length})
              </Button>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={clearAllHistory}
                  className="text-red-400 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 transition-all duration-200"
                  startContent={<IconTrash className="w-4 h-4" />}
                  size="lg"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Main Content */}
          {showHistory ? (
            <HistoryView history={history} onView={viewFlashcardSet} onDelete={deleteFromHistory} />
          ) : (
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Generation Panel */}
              <div className="lg:col-span-3">
                <Card className="bg-black/30 backdrop-blur-xl border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-white/20 h-fit mb-6">
                  <CardBody className="p-6">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
                        <IconBrain className="w-5 h-5" />
                      </div>
                      Generate Flashcards
                    </h2>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-white/90 text-sm font-medium block">Topic</label>
                        <Input
                          placeholder="Enter a topic"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          classNames={{
                            input: "text-white bg-transparent placeholder:text-white/40",
                            inputWrapper:
                              "border border-white/20 hover:border-white/40 focus-within:border-purple-500/60 bg-white/5 backdrop-blur-sm h-10 rounded-lg transition-all duration-200",
                          }}
                          size="sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-white/90 text-sm font-medium block">Number of Cards</label>
                        <Input
                          type="number"
                          min="15"
                          max="25"
                          value={count.toString()}
                          onChange={(e) => setCount(Math.max(15, Math.min(25, Number.parseInt(e.target.value) || 15)))}
                          classNames={{
                            input: "text-white bg-transparent",
                            inputWrapper:
                              "border border-white/20 hover:border-white/40 focus-within:border-purple-500/60 bg-white/5 backdrop-blur-sm h-10 rounded-lg transition-all duration-200",
                          }}
                          size="sm"
                        />
                      </div>

                      <Button
                        onClick={generateFlashcards}
                        isLoading={isGenerating}
                        disabled={!topic.trim() || isGenerating}
                        className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-semibold shadow-lg hover:shadow-gray-500/25 transition-all duration-200 hover:scale-[1.02] h-10"
                        size="sm"
                        startContent={!isGenerating && <IconPlus className="w-4 h-4" />}
                      >
                        {isGenerating ? "Generating..." : "Generate"}
                      </Button>
                    </div>

                    {selectedSet && (
                      <div className="mt-4 p-3 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-xl border border-green-500/20 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white font-semibold text-sm">{selectedSet.topic}</h3>
                            <p className="text-white/60 text-xs">
                              {selectedSet.count} cards • {new Date(selectedSet.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Chip color="success" variant="flat" size="sm">
                            Current
                          </Chip>
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Progress Stats */}
                {currentFlashcards.length > 0 && (
                  <Card className="bg-black/30 backdrop-blur-xl border border-white/10 shadow-xl">
                    <CardBody className="p-4">
                      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <IconStar className="w-4 h-4" />
                        Progress
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/70">Completed</span>
                          <span className="text-white font-semibold">
                            {completedCards.size}/{currentFlashcards.length}
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(completedCards.size / currentFlashcards.length) * 100}%` }}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCompletedCards(new Set())}
                          className="w-full text-white/60 hover:bg-white/10 hover:text-white"
                          startContent={<IconRefresh className="w-4 h-4" />}
                        >
                          Reset Progress
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>

              {/* Flashcards List */}
              <div className="lg:col-span-4">
                {currentFlashcards.length > 0 ? (
                  <FlashcardsList
                    flashcards={currentFlashcards}
                    selectedIndex={selectedCardIndex}
                    onSelect={setSelectedCardIndex}
                    completedCards={completedCards}
                    onToggleComplete={markCardAsCompleted}
                  />
                ) : (
                  <Card className="bg-black/30 backdrop-blur-xl border border-white/10 h-full shadow-xl min-h-[500px]">
                    <CardBody className="flex items-center justify-center p-8">
                      <div className="text-center">
                        <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full w-fit mx-auto mb-4">
                          <IconCards className="w-12 h-12 text-white/30" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No Flashcards Yet</h3>
                        <p className="text-white/60">
                          Generate flashcards or select from history to get started
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>

              {/* Flashcard Viewer */}
              <div className="lg:col-span-5">
                {currentFlashcards.length > 0 ? (
                  <FlashcardViewer
                    flashcard={currentFlashcards[selectedCardIndex]}
                    cardIndex={selectedCardIndex}
                    totalCards={currentFlashcards.length}
                    isCompleted={completedCards.has(selectedCardIndex)}
                    onToggleComplete={() => markCardAsCompleted(selectedCardIndex)}
                  />
                ) : (
                  <Card className="bg-black/30 backdrop-blur-xl border border-white/10 h-full shadow-xl min-h-[500px]">
                    <CardBody className="flex items-center justify-center p-8">
                      <div className="text-center">
                        <div className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full w-fit mx-auto mb-4">
                          <IconFlipVertical className="w-12 h-12 text-white/30" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Select a Flashcard</h3>
                        <p className="text-white/60">
                          Choose a flashcard from the list to view it here
                        </p>
                      </div>
                    </CardBody>
                  </Card>                )}
              </div>
            </div>
          )}
        </div>

        {/* Floating Dock positioned like macOS taskbar */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <FloatingDock
            mobileClassName="translate-y-20"
            items={dockLinks}
            activeItem="/flashCard"
          />
        </div>
      </WavyBackground>
    </div>
  )
}

// Flashcards List Component
function FlashcardsList({
  flashcards,
  selectedIndex,
  onSelect,
  completedCards,
  onToggleComplete,
}: {
  flashcards: Flashcard[]
  selectedIndex: number
  onSelect: (index: number) => void
  completedCards: Set<number>
  onToggleComplete: (index: number) => void
}) {
  return (
    <Card className="bg-black/30 backdrop-blur-xl border border-white/10 shadow-xl h-full">
      <CardBody className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Flashcards</h2>
          <Chip color="primary" variant="flat" size="sm">
            {flashcards.length} cards
          </Chip>
        </div>
        
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
          {flashcards.map((flashcard, index) => (
            <Card
              key={flashcard.id || index}
              className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                selectedIndex === index
                  ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/40"
                  : "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20"
              }`}
              isPressable
              onPress={() => onSelect(index)}
            >
              <CardBody className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-purple-300 bg-purple-500/20 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      {completedCards.has(index) && (
                        <IconCheck className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <p className="text-white/90 text-sm font-medium line-clamp-2 leading-relaxed">
                      {flashcard.question}
                    </p>
                  </div>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleComplete(index)
                    }}
                    className={`min-w-unit-6 w-6 h-6 ${
                      completedCards.has(index)
                        ? "text-green-400 hover:bg-green-500/20"
                        : "text-white/40 hover:bg-white/10 hover:text-white/60"
                    }`}
                  >
                    <IconCheck className="w-3 h-3" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

// Single Flashcard Viewer Component
function FlashcardViewer({
  flashcard,
  cardIndex,
  totalCards,
  isCompleted,
  onToggleComplete,
}: {
  flashcard: Flashcard
  cardIndex: number
  totalCards: number
  isCompleted: boolean
  onToggleComplete: () => void
}) {
  const [isFlipped, setIsFlipped] = useState(false)

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false)
  }, [cardIndex])

  return (
    <Card className="bg-black/30 backdrop-blur-xl border border-white/10 shadow-xl h-full">
      <CardBody className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Card {cardIndex + 1} of {totalCards}</h2>
            {isCompleted && (
              <Chip color="success" variant="flat" size="sm" startContent={<IconCheck className="w-3 h-3" />}>
                Completed
              </Chip>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleComplete}
            className={`${
              isCompleted
                ? "text-green-400 hover:bg-green-500/20"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            }`}
            startContent={<IconCheck className="w-4 h-4" />}
          >
            {isCompleted ? "Completed" : "Mark Complete"}
          </Button>
        </div>

        {/* Flashcard */}
        <div
          className="relative h-[400px] w-full mb-6"
          style={{ perspective: "1000px" }}
        >
          <div
            className="absolute inset-0 w-full h-full transition-all duration-700 ease-in-out cursor-pointer"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            {/* Front (Question) */}
            <Card
              className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 hover:border-blue-500/50 transition-all duration-300"
              style={{ backfaceVisibility: "hidden" }}
            >
              <CardBody className="flex items-center justify-center p-8 text-center h-full">
                <div>
                  <div className="mb-4">
                    <Chip color="primary" variant="flat" size="sm">
                      Question
                    </Chip>
                  </div>
                  <p className="text-white text-lg font-medium leading-relaxed">
                    {flashcard.question}
                  </p>
                </div>
              </CardBody>
            </Card>

            {/* Back (Answer) */}
            <Card
              className="absolute inset-0 w-full h-full bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/30 hover:border-green-500/50 transition-all duration-300"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <CardBody className="flex items-center justify-center p-8 text-center h-full">
                <div>
                  <div className="mb-4">
                    <Chip color="success" variant="flat" size="sm">
                      Answer
                    </Chip>
                  </div>
                  <p className="text-white text-xl font-semibold leading-relaxed">
                    {flashcard.answer}
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Flip Button */}
        <Button
          onClick={() => setIsFlipped(!isFlipped)}
          className="w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 hover:border-purple-500/50 backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] h-12 font-semibold"
          size="lg"
          startContent={<IconFlipVertical className="w-5 h-5" />}
        >
          {isFlipped ? "Show Question" : "Show Answer"}
        </Button>
      </CardBody>
    </Card>
  )
}

// History View Component (unchanged)
function HistoryView({
  history,
  onView,
  onDelete,
}: {
  history: FlashcardSet[]
  onView: (set: FlashcardSet) => void
  onDelete: (setId: string) => void
}) {
  if (history.length === 0) {
    return (
      <Card className="bg-black/30 backdrop-blur-xl border border-white/10 shadow-xl">
        <CardBody className="flex items-center justify-center p-16">
          <div className="text-center">
            <div className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full w-fit mx-auto mb-6 hover:scale-110 transition-transform duration-300">
              <IconHistory className="w-16 h-16 text-white/30" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">No History Yet</h3>
            <p className="text-white/60 text-lg">Generate some flashcards to see them here</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {history.map((set, index) => (
        <Card
          key={set.id}
          className="bg-black/30 backdrop-blur-xl border border-white/10 hover:bg-black/40 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl shadow-lg hover:border-white/30 group cursor-pointer"
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          <CardBody className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-white font-semibold text-lg truncate pr-2 group-hover:text-purple-300 transition-colors duration-200">
                {set.topic}
              </h3>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(set.id)
                }}
                className="text-red-400 hover:bg-red-500/20 hover:text-red-300 min-w-unit-8 w-8 h-8 hover:scale-110 transition-all duration-200"
              >
                <IconTrash className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <Chip
                  size="sm"
                  color="primary"
                  variant="flat"
                  className="font-semibold group-hover:scale-105 transition-transform duration-200"
                >
                  {set.count} cards
                </Chip>
              </div>
              <p className="text-white/60 text-sm group-hover:text-white/80 transition-colors duration-200">
                Created:{" "}
                {new Date(set.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            <Button
              onClick={() => onView(set)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg hover:shadow-blue-500/25 transition-all duration-200 hover:scale-[1.02] group-hover:from-blue-400 group-hover:to-purple-400"
              startContent={<IconEye className="w-4 h-4" />}
              size="lg"
            >
              View Cards
            </Button>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}