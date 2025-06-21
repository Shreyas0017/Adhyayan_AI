"use client";
import React from "react";
import { Spotlight } from "@/components/ui/spotlight-new";
import { FlipWords } from "@/components/ui/flip-words";
import GoogleSignInButton from "@/components/ui/google-signin-button";
import LearnMoreButton from "@/components/ui/learn-more-button";

export function SpotlightNewDemo() {
  const words = ["Transform", "Revolutionize", "Accelerate", "Master"];

  return (
    <div className="h-[40rem] w-full rounded-md flex md:items-center md:justify-center bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
      <Spotlight />
      <div className="p-4 max-w-7xl mx-auto relative z-10 w-full pt-20 md:pt-0">
        <h1 className="text-4xl md:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50">
          Ready to <FlipWords words={words} /> <br /> Your Learning Journey?
        </h1>
        <p className="mt-4 font-normal text-base text-neutral-300 max-w-lg text-center mx-auto">
          Start your personalized learning experience today.
        </p>
          {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center items-center relative">
          <GoogleSignInButton />
          <LearnMoreButton />
        </div>
      </div>
    </div>
  );
}
