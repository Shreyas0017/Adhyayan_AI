"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardBody, Button, Input, Chip } from "@heroui/react"
import { WavyBackground } from "@/components/ui/wavy-background"
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay"
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
  IconChevronLeft,
  IconChevronRight,
  IconFlipVertical,
  IconStar,
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
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [topic, setTopic] = useState("")
  const [count, setCount] = useState(15)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentFlashcards, setCurrentFlashcards] = useState<Flashcard[]>([])
  const [history, setHistory] = useState<FlashcardSet[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null)

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

  return (
    <div className="min-h-screen relative overflow-hidden">
      <WavyBackground className="min-h-screen">
        {/* Gyan Points Display */}
        <div className="fixed top-4 right-4 z-50">
          <GyanPointsDisplay />
        </div>

        {/* Main Container - Reasonable Size */}
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
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
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
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Generation Panel - 1 column */}
              <div className="lg:col-span-1">
                <Card className="bg-black/30 backdrop-blur-xl border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-white/20 h-fit">
                  <CardBody className="p-6">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
                        <IconBrain className="w-6 h-6" />
                      </div>
                      Generate Flashcards
                    </h2>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-white/90 text-sm font-medium block">Topic</label>
                        <Input
                          placeholder="Enter a topic (e.g., Photosynthesis)"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          classNames={{
                            input: "text-white bg-transparent placeholder:text-white/40",
                            inputWrapper:
                              "border border-white/20 hover:border-white/40 focus-within:border-purple-500/60 bg-white/5 backdrop-blur-sm h-12 rounded-lg transition-all duration-200",
                          }}
                          size="lg"
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
                              "border border-white/20 hover:border-white/40 focus-within:border-purple-500/60 bg-white/5 backdrop-blur-sm h-12 rounded-lg transition-all duration-200",
                          }}
                          size="lg"
                        />
                        <p className="text-white/50 text-xs">Choose between 15-25 cards</p>
                      </div>

                      {/* Grey Generate Button */}
                      <Button
                        onClick={generateFlashcards}
                        isLoading={isGenerating}
                        disabled={!topic.trim() || isGenerating}
                        className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-semibold shadow-lg hover:shadow-gray-500/25 transition-all duration-200 hover:scale-[1.02] h-12"
                        size="lg"
                        startContent={!isGenerating && <IconPlus className="w-5 h-5" />}
                      >
                        {isGenerating ? "Generating..." : "Generate Flashcards"}
                      </Button>
                    </div>

                    {selectedSet && (
                      <div className="mt-6 p-4 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-xl border border-green-500/20 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white font-semibold">{selectedSet.topic}</h3>
                            <p className="text-white/60 text-sm">
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
              </div>

              {/* Flashcard Display - 2 columns */}
              <div className="lg:col-span-2">
                {currentFlashcards.length > 0 ? (
                  <FlashcardViewer flashcards={currentFlashcards} />
                ) : (
                  <Card className="bg-black/30 backdrop-blur-xl border border-white/10 h-full shadow-xl min-h-[500px] hover:shadow-2xl transition-all duration-300 hover:border-white/20">
                    <CardBody className="flex items-center justify-center p-12">
                      <div className="text-center">
                        <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full w-fit mx-auto mb-6 hover:scale-110 transition-transform duration-300">
                          <IconCards className="w-16 h-16 text-white/30" />
                        </div>
                        <h3 className="text-2xl font-semibold text-white mb-3">No Flashcards Yet</h3>
                        <p className="text-white/60 text-lg">
                          Generate flashcards or select from history to get started
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </WavyBackground>
    </div>
  )
}

// History View Component with enhanced hover effects
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

// Enhanced Flashcard Viewer with proper answer-only display
function FlashcardViewer({ flashcards }: { flashcards: Flashcard[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % flashcards.length)
    setIsFlipped(false)
  }

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length)
    setIsFlipped(false)
  }

  const currentCard = flashcards[currentIndex]

  // Enhanced text cleaning function to fix all encoding issues
  const cleanText = (text: string) => {
    if (!text) return ""

    return (
      text
        // Remove all non-printable and problematic characters
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
        // Remove zero-width characters
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        // Remove any remaining control characters
        .replace(/[\x00-\x1F\x7F]/g, "")
        // Normalize whitespace
        .replace(/\s+/g, " ")
        // Remove any remaining weird characters that might cause overlap
        .replace(/[^\w\s.,!?;:()\-'"]/g, "")
        .trim()
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-white/90 text-xl font-semibold">
            Card {currentIndex + 1} of {flashcards.length}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setCurrentIndex(0)
              setIsFlipped(false)
            }}
            className="text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200 hover:scale-105"
            startContent={<IconRefresh className="w-4 h-4" />}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden backdrop-blur-sm">
        <div
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500 ease-out shadow-lg"
          style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
        />
      </div>

      {/* Interactive Flashcard with Enhanced Hover Effects */}
      <div
        className="relative h-[400px] w-full group overflow-hidden"
        style={{ perspective: "1000px", willChange: "transform", zIndex: 0 }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div
          className="absolute inset-0 w-full h-full transition-all duration-700 ease-in-out cursor-pointer"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            height: "100%",
            willChange: "transform",
            zIndex: 0,
          }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front (Question) */}
          <Card
            className="absolute inset-0 w-full h-full overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              willChange: "transform",
              zIndex: 0,
            }}
          >
            <CardBody
              className="flex items-center justify-center p-8 text-center h-full relative overflow-hidden"
            >
              <span className="text-2xl font-bold text-white">{flashcards[currentIndex]?.question}</span>
            </CardBody>
          </Card>

          {/* Back (Answer) */}
          <Card
            className="absolute inset-0 w-full h-full overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              willChange: "transform",
              zIndex: 0,
            }}
          >
            <CardBody
              className="flex items-center justify-center p-8 text-center h-full relative overflow-hidden"
            >
              <span className="text-4xl font-bold text-green-200">{flashcards[currentIndex]?.answer}</span>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Enhanced Navigation Controls */}
      <div className="flex justify-between items-center gap-4">
        <Button
          onClick={prevCard}
          disabled={flashcards.length <= 1}
          variant="ghost"
          className="text-white hover:bg-white/10 border border-white/20 hover:border-white/40 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 h-12 px-6"
          startContent={<IconChevronLeft className="w-5 h-5" />}
          size="lg"
        >
          Previous
        </Button>

        <Button
          onClick={() => setIsFlipped(!isFlipped)}
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 hover:border-purple-500/50 backdrop-blur-sm transition-all duration-200 hover:scale-105 h-12 px-6 font-semibold"
          size="lg"
          startContent={<IconFlipVertical className="w-5 h-5" />}
        >
          {isFlipped ? "Show Question" : "Show Answer"}
        </Button>

        <Button
          onClick={nextCard}
          disabled={flashcards.length <= 1}
          variant="ghost"
          className="text-white hover:bg-white/10 border border-white/20 hover:border-white/40 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 h-12 px-6"
          endContent={<IconChevronRight className="w-5 h-5" />}
          size="lg"
        >
          Next
        </Button>
      </div>

      {/* Interactive Card Navigation Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {flashcards.slice(0, Math.min(10, flashcards.length)).map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index)
              setIsFlipped(false)
            }}
            className={`w-3 h-3 rounded-full transition-all duration-200 hover:scale-125 ${
              index === currentIndex
                ? "bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg scale-125"
                : "bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
        {flashcards.length > 10 && (
          <span className="text-white/40 text-sm self-center ml-2">+{flashcards.length - 10} more</span>
        )}
      </div>
    </div>
  )
}