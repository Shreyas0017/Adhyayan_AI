"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Loader2,
  Zap,
  RotateCcw,
  Lightbulb,
  GraduationCap,
  FlipVertical,
  Stars,
  ArrowLeftCircle,
  ArrowRightCircle,
  Mic,
  MicOff,
  Upload,
} from "lucide-react"

interface Flashcard {
  id: string
  question: string
  answer: string
}

declare global {
  interface Window {
    webkitSpeechRecognition: any
    SpeechRecognition: any
  }
}

export default function FlashCardPage() {
  const [topic, setTopic] = useState("")
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [flippedCards, setFlippedCards] = useState<{ [key: string]: boolean }>({})
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)
  const [transcript, setTranscript] = useState("")
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      const recognitionInstance = new SpeechRecognition()

      recognitionInstance.continuous = true
      recognitionInstance.interimResults = true
      recognitionInstance.lang = "en-US"

      recognitionInstance.onresult = (event) => {
        let finalTranscript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript)
          setTopic((prev) => prev + " " + finalTranscript)
        }
      }

      recognitionInstance.onend = () => {
        setIsListening(false)
      }

      recognitionInstance.onerror = (event) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
      }

      setRecognition(recognitionInstance)
      recognitionRef.current = recognitionInstance
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null
        recognitionRef.current.onend = null
        recognitionRef.current.onerror = null
      }
    }
  }, [])

  const generateFlashcards = async () => {
    if (!topic.trim()) return

    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      setFlashcards(data.flashcards)
      setCurrentCardIndex(0)
      setFlippedCards({})
    } catch (error) {
      console.error("Error generating flashcards:", error)

      // Show user-friendly error message
      alert(
        `Error: ${error instanceof Error ? error.message : "Failed to generate flashcards. Please check your API key and try again."}`,
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCardFlip = (cardId: string) => {
    setFlippedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }))
  }

  const nextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1)
    }
  }

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1)
    }
  }

  const resetCards = () => {
    setFlashcards([])
    setTopic("")
    setCurrentCardIndex(0)
    setFlippedCards({})
  }

  const startListening = () => {
    if (recognition) {
      setIsListening(true)
      setTranscript("")
      recognition.start()
    } else {
      alert("Speech recognition is not supported in your browser")
    }
  }

  const stopListening = () => {
    if (recognition) {
      recognition.stop()
      setIsListening(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "text/plain") {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setTopic(content.substring(0, 500)) // Limit to 500 characters
      }
      reader.readAsText(file)
    } else {
      alert("Please upload a text file (.txt)")
    }
  }

  const currentCard = flashcards[currentCardIndex]
  const isFlipped = flippedCards[currentCard?.id] || false

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gray-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gray-500/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fillOpacity='0.1'%3E%3Cpath d='M20 20.5V18H18v2.5h-2.5V22H18v2.5h2V22h2.5v-1.5H20z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Header Section */}
      <div className="relative z-10 py-16 text-center">
        <div className="flex items-center justify-center mb-8">
          <div className="relative">
            <GraduationCap className="h-16 w-16 mr-6 text-white" />
            <div className="absolute inset-0 h-16 w-16 mr-6 bg-white opacity-20 blur-xl" />
          </div>
          <div className="relative">
            <h1 className="text-7xl font-black text-white tracking-tight">अध्ययन</h1>
          </div>
        </div>

        <div className="relative inline-block">
          <h2 className="text-3xl font-bold text-slate-300 mb-6 tracking-wide">Smart Flashcards</h2>
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" />
        </div>

        <div className="mt-8 flex flex-col items-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-full border border-gray-700">
            <Stars className="h-4 w-4 text-white animate-pulse" />
            <span className="text-sm font-medium bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Powered by Gemini AI
            </span>
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          {/* Topic Input Section */}
          {flashcards.length === 0 && (
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-xl mb-12 shadow-2xl hover:bg-gray-900/70 transition-all duration-500">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-3xl flex items-center font-bold">
                  <Lightbulb className="h-8 w-8 mr-3 text-blue-400" />
                  Create Your Flashcards
                </CardTitle>
                <p className="text-slate-300 text-lg mt-2">
                  Enter any topic and let AI generate personalized study cards for you
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="topic" className="text-slate-200 text-lg font-medium">
                      What would you like to study?
                    </Label>
                    <div className="relative">
                      <Input
                        id="topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., JavaScript fundamentals, World War II, Photosynthesis, Machine Learning..."
                        className="bg-black/20 border-white/20 text-white placeholder:text-slate-400 focus:border-purple-400 focus:ring-purple-400/50 h-14 text-lg px-6 pr-32 rounded-xl backdrop-blur-sm"
                        onKeyPress={(e) => e.key === "Enter" && generateFlashcards()}
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 pointer-events-none" />

                      {/* Voice and Upload Controls */}
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
                        {/* File Upload */}
                        <div className="relative">
                          <input
                            type="file"
                            accept=".txt"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            title="Upload syllabus file"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white rounded-lg"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Voice Input */}
                        <Button
                          type="button"
                          onClick={isListening ? stopListening : startListening}
                          variant="ghost"
                          size="sm"
                          className={`h-10 w-10 p-0 rounded-lg transition-all duration-300 ${
                            isListening
                              ? "bg-red-600/50 hover:bg-red-500/50 text-red-200 animate-pulse"
                              : "bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white"
                          }`}
                        >
                          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Voice Recording Indicator */}
                    {isListening && (
                      <div className="flex items-center gap-2 text-sm text-red-300 bg-red-900/20 px-3 py-2 rounded-lg border border-red-800/50">
                        <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                        Recording... Speak your syllabus content
                      </div>
                    )}

                    {/* Instructions */}
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>
                        💡 <strong>Voice Input:</strong> Click the microphone to speak your syllabus content
                      </p>
                      <p>
                        📄 <strong>File Upload:</strong> Click the upload icon to select a .txt file with your syllabus
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={generateFlashcards}
                    disabled={isGenerating || !topic.trim()}
                    className="w-full h-14 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 disabled:opacity-50 text-lg font-semibold rounded-xl shadow-lg hover:shadow-gray-500/25 transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                        Generating Your Flashcards...
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5 mr-3" />
                        Generate Flashcards
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flashcard Display */}
          {flashcards.length > 0 && currentCard && (
            <div className="space-y-8">
              {/* Progress Section */}
              <div className="flex items-center justify-between bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-white">
                    {currentCardIndex + 1}
                    <span className="text-slate-400 font-normal">/{flashcards.length}</span>
                  </div>
                  <div className="text-slate-300">
                    Progress: {Math.round(((currentCardIndex + 1) / flashcards.length) * 100)}%
                  </div>
                </div>
                <Button
                  onClick={resetCards}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30 rounded-xl px-6 py-3 font-medium transition-all duration-300"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  New Topic
                </Button>
              </div>

              {/* Enhanced Progress Bar */}
              <div className="relative w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                  style={{
                    width: `${((currentCardIndex + 1) / flashcards.length) * 100}%`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                </div>
              </div>

              {/* Enhanced Flip Card */}
              <div className="flex justify-center">
                <div className="w-full max-w-3xl">
                  <div className="relative w-full h-96 perspective-1000">
                    {/* Question Card */}
                    <div
                      className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out cursor-pointer transform-style-preserve-3d ${
                        isFlipped
                          ? "opacity-0 scale-95 rotate-y-180 pointer-events-none"
                          : "opacity-100 scale-100 rotate-y-0"
                      }`}
                      onClick={() => handleCardFlip(currentCard.id)}
                    >
                      <Card className="w-full h-full bg-gradient-to-br from-blue-900/90 via-blue-800/90 to-blue-700/90 border-blue-700 backdrop-blur-xl hover:from-blue-800/90 hover:via-blue-700/90 hover:to-blue-600/90 transition-all duration-500 shadow-2xl hover:shadow-blue-500/20 rounded-3xl group">
                        <CardContent className="p-10 h-full flex flex-col justify-center items-center text-center relative overflow-hidden">
                          {/* Animated Background */}
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-indigo-500/5 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-indigo-500/10 transition-all duration-500" />

                          {/* Question Badge */}
                          <div className="absolute top-8 left-8">
                            <div className="bg-blue-500/20 text-blue-200 px-4 py-2 rounded-full text-sm font-bold border border-blue-400/50 backdrop-blur-sm">
                              QUESTION
                            </div>
                          </div>

                          {/* Flip Icon */}
                          <div className="absolute top-8 right-8">
                            <div className="p-2 bg-white/10 rounded-full backdrop-blur-sm">
                              <FlipVertical className="h-6 w-6 text-blue-300 group-hover:animate-spin" />
                            </div>
                          </div>

                          {/* Question Content */}
                          <div className="flex-1 flex items-center justify-center px-6 relative z-10">
                            <p className="text-3xl text-white leading-relaxed font-semibold text-center max-w-2xl">
                              {currentCard.question}
                            </p>
                          </div>

                          {/* Enhanced Hint */}
                          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                            <div className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
                              <div className="flex gap-1">
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                                <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-100"></span>
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-200"></span>
                              </div>
                              <p className="text-sm text-blue-200 font-medium">Click to reveal answer</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Answer Card */}
                    <div
                      className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out cursor-pointer transform-style-preserve-3d ${
                        isFlipped
                          ? "opacity-100 scale-100 rotate-y-0"
                          : "opacity-0 scale-95 rotate-y-180 pointer-events-none"
                      }`}
                      onClick={() => handleCardFlip(currentCard.id)}
                    >
                      <Card className="w-full h-full bg-gradient-to-br from-green-900/90 via-emerald-800/90 to-green-700/90 border-green-700 backdrop-blur-xl hover:from-green-800/90 hover:via-emerald-700/90 hover:to-green-600/90 transition-all duration-500 shadow-2xl hover:shadow-green-500/20 rounded-3xl group">
                        <CardContent className="p-10 h-full flex flex-col justify-center items-center text-center relative overflow-hidden">
                          {/* Animated Background */}
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-green-500/5 to-teal-500/5 group-hover:from-emerald-500/10 group-hover:via-green-500/10 group-hover:to-teal-500/10 transition-all duration-500" />

                          {/* Answer Badge */}
                          <div className="absolute top-8 left-8">
                            <div className="bg-emerald-500/20 text-emerald-200 px-4 py-2 rounded-full text-sm font-bold border border-emerald-400/50 backdrop-blur-sm">
                              ANSWER
                            </div>
                          </div>

                          {/* Flip Icon */}
                          <div className="absolute top-8 right-8">
                            <div className="p-2 bg-white/10 rounded-full backdrop-blur-sm">
                              <FlipVertical className="h-6 w-6 text-emerald-300 group-hover:animate-spin" />
                            </div>
                          </div>

                          {/* Answer Content */}
                          <div className="flex-1 flex items-center justify-center px-6 relative z-10">
                            <p className="text-2xl text-white leading-relaxed text-center max-w-2xl font-medium">
                              {currentCard.answer}
                            </p>
                          </div>

                          {/* Enhanced Hint */}
                          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                            <div className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
                              <div className="flex gap-1">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-100"></span>
                                <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse delay-200"></span>
                              </div>
                              <p className="text-sm text-emerald-200 font-medium">Click to see question</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Navigation Controls */}
              <div className="flex justify-center items-center space-x-6">
                <Button
                  onClick={prevCard}
                  disabled={currentCardIndex === 0}
                  variant="outline"
                  className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600 hover:border-gray-500 disabled:opacity-30 rounded-xl px-8 py-4 font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
                >
                  <ArrowLeftCircle className="h-5 w-5 mr-2" />
                  Previous
                </Button>

                <div className="flex items-center gap-2 px-6 py-3 bg-gray-900/50 rounded-xl border border-gray-800">
                  {flashcards.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === currentCardIndex ? "bg-blue-500 scale-125" : "bg-gray-600 hover:bg-gray-500"
                      }`}
                    />
                  ))}
                </div>

                <Button
                  onClick={nextCard}
                  disabled={currentCardIndex === flashcards.length - 1}
                  variant="outline"
                  className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600 hover:border-gray-500 disabled:opacity-30 rounded-xl px-8 py-4 font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
                >
                  Next
                  <ArrowRightCircle className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}