'use client'

import { SpiralAnimation } from "@/components/ui/spiral-animation"
import { useState, useEffect } from 'react'

interface SpiralIntroProps {
  onEnter: () => void
}

const SpiralIntro = ({ onEnter }: SpiralIntroProps) => {
  const [startVisible, setStartVisible] = useState(false)
  
  // Fade in the start button after animation loads
  useEffect(() => {
    const timer = setTimeout(() => {
      setStartVisible(true)
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [])
  
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black">
      {/* Spiral Animation */}
      <div className="absolute inset-0">
        <SpiralAnimation />
      </div>
        {/* Simple Elegant Text Button with Pulsing Effect */}
      <div 
        className={`
          absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10
          transition-all duration-1500 ease-out text-center
          ${startVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
      >
        <button 
          onClick={onEnter}
          className="
            text-white text-2xl tracking-[0.2em] uppercase font-extralight
            transition-all duration-700
            hover:tracking-[0.3em] animate-pulse
            hover:text-gray-300 block mb-2
          "
        >
          Enter
        </button>
        <p className="text-gray-400 text-sm font-light tracking-wide">
          Begin your AI-powered learning journey
        </p>
      </div>
    </div>
  )
}

export { SpiralIntro }
