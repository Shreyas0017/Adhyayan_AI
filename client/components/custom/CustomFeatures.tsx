'use client';

import { BookOpen, Map, MessageSquare, Headphones, Users } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export function CustomFeatures() {
  return (
    <section className="w-full py-12 md:py-16 bg-background relative z-15">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Revolutionary Learning Experience</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Transform how you learn with Adhyayan AI&apos;s innovative features, designed to make studying engaging, 
            personalized, and effective.
          </p>
        </div>
        
        <ul className="grid grid-cols-1 grid-rows-none gap-3 md:grid-cols-12 md:grid-rows-3 lg:gap-5 xl:max-h-[36rem] xl:grid-rows-2">
          <GridItem
            area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]"
            icon={<Map className="h-4 w-4 text-black dark:text-neutral-400" />}
            title="Interactive Mind Maps"
            description="Generate comprehensive mind maps from any syllabus. Visualize topics, subtopics, and connections in an interactive, draggable interface."
          />

          <GridItem
            area="md:[grid-area:1/7/2/13] xl:[grid-area:2/1/3/5]"
            icon={<BookOpen className="h-4 w-4 text-black dark:text-neutral-400" />}
            title="Detailed Topic Notes"
            description="Click on any topic node to access detailed notes. Mark topics as read as you progress through your learning journey."
          />

          <GridItem
            area="md:[grid-area:2/1/3/7] xl:[grid-area:1/5/3/8]"
            icon={<MessageSquare className="h-4 w-4 text-black dark:text-neutral-400" />}
            title="AI-Powered Chat Assistant"
            description="Ask questions, request explanations, or clarify concepts with our smart AI chat assistant integrated with each topic."
          />

          <GridItem
            area="md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]"
            icon={<Headphones className="h-4 w-4 text-black dark:text-neutral-400" />}
            title="Generated Podcasts"
            description="Convert any topic into an engaging podcast format with two-person dialogues for an immersive audio learning experience."
          />

          <GridItem
            area="md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]"
            icon={<Users className="h-4 w-4 text-black dark:text-neutral-400" />}
            title="Collaborative Quizzes"
            description="Create rooms, invite friends, and compete in real-time quizzes. Track progress with live leaderboards and enhance your learning."
          />
        </ul>
      </div>
    </section>
  );
}

interface GridItemProps {
  area: string;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}

const GridItem = ({ area, icon, title, description }: GridItemProps) => {
  return (
    <li className={`min-h-[14rem] list-none ${area}`}>
      <div className="relative h-full rounded-2xl border p-2 md:rounded-3xl md:p-3">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />
        <div className="border-0.75 relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl p-6 md:p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D]">
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            <div className="w-fit rounded-lg border border-gray-600 p-2">
              {icon}
            </div>
            <div className="space-y-3">
              <h3 className="-tracking-4 pt-0.5 font-sans text-xl/[1.375rem] font-semibold text-balance text-black md:text-2xl/[1.875rem] dark:text-white">
                {title}
              </h3>
              <h2 className="font-sans text-sm/[1.125rem] text-black md:text-base/[1.375rem] dark:text-neutral-400 [&_b]:md:font-semibold [&_strong]:md:font-semibold">
                {description}
              </h2>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};
