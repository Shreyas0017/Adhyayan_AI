'use client'; 

import { HeroSection } from "@/components/hero-section-1";
import { CustomFeatures } from "@/components/custom/CustomFeatures";
import { InfiniteMovingCardsDemo } from "@/components/custom/InfiniteMovingCardsDemo";
import { FAQSection } from "@/components/custom/FAQSection";
import { SpotlightNewDemo } from "@/components/custom/SpotlightNewDemo";
import { ProfessionalFooter } from "@/components/custom/ProfessionalFooter";

export const HeroPage = () => {
  return (
    <>
      <div className="mt-[-3.5rem] home-page-hero">
        <HeroSection />
      </div>
      <CustomFeatures />
      <InfiniteMovingCardsDemo />
      <FAQSection />
      <SpotlightNewDemo />
      <ProfessionalFooter />
    </>
  );
};

export const products = [
  {
    title: "AI Learning Maps",
    link: "#features",
    thumbnail:
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop",
  },
  {
    title: "Personalized Study Paths",
    link: "#features",
    thumbnail:
      "https://images.unsplash.com/photo-1509475826633-fed577a2c71b?q=80&w=800&auto=format&fit=crop",
  },
  {
    title: "Interactive Lessons",
    link: "#features",
    thumbnail:
      "https://images.unsplash.com/photo-1568952433726-3896e3881c65?q=80&w=800&auto=format&fit=crop",
  },
  {
    title: "Knowledge Assessment",
    link: "#features",
    thumbnail:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop",
  },
  {
    title: "AI Tutor Assistant",
    link: "#features",
    thumbnail:
      "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?q=80&w=800&auto=format&fit=crop",
  },
  {
    title: "Skill Mapping",
    link: "#features",
    thumbnail:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop",
  },
  {
    title: "Collaborative Learning",
    link: "#features",
    thumbnail:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop",
  },
  {
    title: "Progress Analytics",
    link: "#features",
    thumbnail:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
  },
  {
    title: "Adaptive Learning",
    link: "#features",
    thumbnail:
      "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=800&auto=format&fit=crop",
  },
  {
    title: "Knowledge Graphs",
    link: "#features",
    thumbnail:
      "https://images.unsplash.com/photo-1610986602538-431d65df4385?q=80&w=800&auto=format&fit=crop",
  },
  {
    title: "Study Groups",
    link: "#features",
    thumbnail:
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=800&auto=format&fit=crop",
  },
  {
    title: "Mind Mapping Tools",
    link: "#features",
    thumbnail:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop",
  },
  {
    title: "Subject Mastery",
    link: "#features",
    thumbnail:
      "https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=80&w=800&auto=format&fit=crop",
  },
  {
    title: "Virtual Classrooms",
    link: "#features",
    thumbnail:
      "https://images.unsplash.com/photo-1531260824084-d58c8a173dec?q=80&w=800&auto=format&fit=crop",
  },
  {
    title: "Learning Analytics",
    link: "#features",
    thumbnail:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop",
  },
];