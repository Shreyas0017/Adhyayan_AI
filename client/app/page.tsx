'use client'

import CustomStickyBanner from "@/components/custom/CustomStickyBanner";
import { HeroPage } from "@/components/custom/HeroPage";
import { SpiralIntro } from "@/components/custom/SpiralIntro";
import { useState, useEffect } from 'react';

export default function Home() {
  const [showIntro, setShowIntro] = useState(true);
  const [hasVisited, setHasVisited] = useState(false);

  // Check if user has already visited (using localStorage)
  useEffect(() => {
    const visited = localStorage.getItem('adhyayan-visited');
    if (visited === 'true') {
      setShowIntro(false);
      setHasVisited(true);
    }
  }, []);

  const handleEnter = () => {
    // Mark as visited in localStorage
    localStorage.setItem('adhyayan-visited', 'true');
    setShowIntro(false);
    setHasVisited(true);
  };

  // Show spiral intro on first visit
  if (showIntro && !hasVisited) {
    return <SpiralIntro onEnter={handleEnter} />;
  }

  // Show main app content
  return (
    <div className="relative flex w-full flex-col overflow-y-auto home-page-container">
      <CustomStickyBanner />
      {/* Main content */}
      <HeroPage />
    </div>
  );
}
