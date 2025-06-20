"use client";

import React from "react";
import { InfiniteMovingCards } from "../ui/infinite-moving-cards";

export function InfiniteMovingCardsDemo() {
  return (
    <div className="h-[40rem] rounded-md flex flex-col antialiased bg-white dark:bg-black dark:bg-grid-white/[0.05] items-center justify-center relative overflow-hidden">
      <div className="mb-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          What Our Students Say
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Discover how Adhyayan AI is transforming the way students learn and master new subjects
        </p>
      </div>
      <InfiniteMovingCards
        items={testimonials}
        direction="right"
        speed="slow"
      />
    </div>
  );
}

const testimonials = [
  {
    quote:
      "Adhyayan AI completely transformed how I approach learning. The personalized study paths helped me master calculus in half the time it would have taken with traditional methods. The AI tutor feels like having a patient teacher available 24/7.",
    name: "Sarah Chen",
    title: "Computer Science Student",
  },
  {
    quote:
      "I was struggling with organic chemistry until I discovered Adhyayan AI. The adaptive learning system identified my weak points and created custom practice problems. My grades improved from C+ to A- in just one semester!",
    name: "Marcus Rodriguez",
    title: "Pre-Med Student",
  },
  {
    quote: 
      "As a working professional, I needed to learn data science quickly. Adhyayan AI's intelligent curriculum adapted to my schedule and learning pace. I landed my dream job as a data analyst within 6 months.",
    name: "Priya Patel",
    title: "Data Analyst",
  },
  {
    quote:
      "The AI-powered explanations are incredible. When I don't understand a concept, the system breaks it down in different ways until it clicks. It's like having multiple tutors with different teaching styles.",
    name: "Sankk Thompson",
    title: "High School Student",
  },
  {
    quote:
      "I've tried many learning platforms, but Adhyayan AI is different. The knowledge mapping feature shows me exactly how concepts connect, making complex subjects feel manageable. My confidence in learning has skyrocketed.",
    name: "Dr. Emily Johnson",
    title: "Lifelong Learner",
  },
  {
    quote:
      "The collaborative learning features helped me connect with study partners who complemented my learning style. Together with the AI insights, we formed an unstoppable study group.",
    name: "David Kim",
    title: "MBA Student",
  },
];
