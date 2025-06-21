"use client";
import React from 'react';
import { CustomNavbar } from "@/components/custom/CustomNavbar";
import { ProfessionalFooter } from "@/components/custom/ProfessionalFooter";
import { WavyBackground } from "@/components/ui/wavy-background";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { CustomStickyBanner } from "@/components/custom/CustomStickyBanner";
import { 
  BookOpen, 
  Map, 
  MessageSquare, 
  Headphones, 
  Users, 
  Brain,
  Zap,
  Target,
  Award,
  Clock,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Play,
  Download,
  Share2,
  Globe,
  Shield,
  Smartphone,
  Star
} from "lucide-react";

export default function LearnMore() {
  return (
    <div className="min-h-screen bg-black text-white learn-more-page">
      <div className="relative z-50">
        <CustomStickyBanner />
        <CustomNavbar />      </div>
      
      {/* Hero Section */}
      <WavyBackground 
        containerClassName="pt-20 pb-20 px-4" 
        className="max-w-7xl mx-auto text-center"
      >
        <div className="mb-8">          <span className="inline-block px-4 py-2 bg-neutral-800/70 border border-neutral-700/50 rounded-full text-neutral-300 text-sm font-medium mb-6">
            🎓 Advanced Learning Platform
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
            Transform Your Learning with{" "}
            <span className="text-white">
              Adhyayan AI
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-neutral-400 max-w-4xl mx-auto leading-relaxed">
            Experience the future of education with our AI-powered platform that adapts to your learning style, 
            creates personalized study paths, and makes complex topics easy to understand.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-12">
          <button 
            onClick={() => window.open('https://youtu.be/demo', '_blank')}
            className="bg-white text-black hover:bg-gray-100 hover:text-black px-8 py-4 rounded-lg font-semibold text-lg transform hover:scale-105 transition-all duration-300 flex items-center gap-2 shadow-lg"
          >            <Play className="w-5 h-5 text-black fill-current" style={{color: '#000'}} />
            Watch Demo
          </button>
          <button 
            onClick={() => window.open('/guide.pdf', '_blank')}
            className="border border-neutral-600 hover:border-neutral-400 text-neutral-300 hover:text-white bg-transparent px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download Guide
          </button>
        </div>
      </WavyBackground>

      {/* Stats Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-white">10,000+</div>
              <div className="text-neutral-400">Active Learners</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-white">95%</div>
              <div className="text-neutral-400">Success Rate</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-white">500+</div>
              <div className="text-neutral-400">Subjects Covered</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-white">24/7</div>
              <div className="text-neutral-400">AI Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Deep Dive */}
      <section className="py-20 px-4 bg-gradient-to-b from-neutral-900/50 to-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Why Choose Adhyayan AI?</h2>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
              Our platform combines cutting-edge AI technology with proven educational methodologies 
              to deliver an unparalleled learning experience.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Brain className="w-8 h-8" />}
              title="AI-Powered Mind Maps"
              description="Generate comprehensive visual learning maps from any syllabus. It analyzes your content and creates interconnected knowledge structures between topics."
              features={["Automatic topic extraction", "Visual knowledge graphs", "Interactive exploration", "Progress tracking"]}
            />
            
            <FeatureCard
              icon={<MessageSquare className="w-8 h-8" />}
              title="Intelligent Chat Assistant"
              description="Get instant answers to your questions with our advanced AI tutor. Ask for explanations, examples, or clarifications on any topic within your study material."
              features={["24/7 availability", "Context-aware responses", "Multi-language support", "Personalized explanations"]}
            />
            
            <FeatureCard
              icon={<Headphones className="w-8 h-8" />}
              title="Generated Podcasts"
              description="Transform your study material into engaging audio content. Perfect for learning on-the-go, our AI creates natural-sounding conversations about your topics."
              features={["Two-person dialogues", "Natural voice synthesis", "Customizable pace", "Offline listening"]}
            />
            
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Collaborative Learning"
              description="Create study rooms, invite friends, and compete in real-time quizzes. Build a community around your learning goals."
              features={["Real-time competitions", "Live leaderboards", "Group discussions", "Peer learning"]}
            />
            
            <FeatureCard
              icon={<Target className="w-8 h-8" />}
              title="Personalized Learning Path"
              description="Our AI adapts to your learning style, pace, and goals to create a customized study plan that maximizes your efficiency and retention."
              features={["Adaptive algorithms", "Performance analytics", "Goal setting", "Progress optimization"]}
            />
            
            <FeatureCard
              icon={<Award className="w-8 h-8" />}
              title="Achievement System"
              description="Stay motivated with our comprehensive achievement system. Earn badges, unlock new features, and track your learning milestones."
              features={["Skill badges", "Progress certificates", "Milestone tracking", "Motivation rewards"]}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">How It Works</h2>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
              Get started with Adhyayan AI in just three simple steps and transform your learning experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <StepCard
              number="01"
              title="Upload Your Content"
              description="Simply upload your syllabus, textbook, or study material. Our AI supports multiple formats including PDF, text, and images."
              icon={<Upload className="w-6 h-6" />}
            />
            
            <StepCard
              number="02"
              title="AI Analysis"
              description="Our advanced AI processes your content, identifies key topics, and creates personalized learning structures tailored to your needs."
              icon={<Zap className="w-6 h-6" />}
            />
            
            <StepCard
              number="03"
              title="Start Learning"
              description="Access your personalized mind maps, chat with AI tutors, listen to generated podcasts, and collaborate with peers."
              icon={<TrendingUp className="w-6 h-6" />}
            />
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-neutral-900/30 to-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Built on Cutting-Edge Technology
              </h2>
              <p className="text-lg text-neutral-400 mb-8">
                Adhyayan AI leverages the latest advances in artificial intelligence, natural language processing, 
                and machine learning to deliver a superior educational experience.
              </p>
              
              <div className="space-y-6">
                <TechFeature
                  icon={<Globe className="w-5 h-5" />}
                  title="Cloud-Based Architecture"
                  description="Access your learning materials from anywhere, anytime with our secure cloud infrastructure."
                />
                <TechFeature
                  icon={<Shield className="w-5 h-5" />}
                  title="Enterprise-Grade Security"
                  description="Your data is protected with bank-level encryption and privacy controls."
                />
                <TechFeature
                  icon={<Smartphone className="w-5 h-5" />}
                  title="Cross-Platform Compatibility"
                  description="Learn seamlessly across desktop, tablet, and mobile devices."
                />
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-2xl p-8 border border-neutral-700">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-black/50 rounded-lg p-4 text-center">
                    <Clock className="w-8 h-8 text-white mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">10x</div>
                    <div className="text-sm text-neutral-400">Faster Learning</div>
                  </div>
                  <div className="bg-black/50 rounded-lg p-4 text-center">
                    <Brain className="w-8 h-8 text-white mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">85%</div>
                    <div className="text-sm text-neutral-400">Better Retention</div>
                  </div>
                  <div className="bg-black/50 rounded-lg p-4 text-center">
                    <Target className="w-8 h-8 text-white mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">90%</div>
                    <div className="text-sm text-neutral-400">Goal Achievement</div>
                  </div>
                  <div className="bg-black/50 rounded-lg p-4 text-center">
                    <Award className="w-8 h-8 text-white mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">4.9/5</div>
                    <div className="text-sm text-neutral-400">User Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">What Our Users Say</h2>
            <p className="text-xl text-neutral-400">
              Join thousands of learners who have transformed their education with Adhyayan AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TestimonialCard
              quote="Adhyayan AI completely changed how I study. The mind maps help me visualize complex topics, and the AI chat is like having a personal tutor available 24/7."
              author="Sarah Chen"
              role="Medical Student"
              rating={5}
            />
            
            <TestimonialCard
              quote="The podcast feature is incredible! I can learn while commuting. The AI-generated conversations make even boring topics engaging and easy to understand."
              author="Rajesh Kumar"
              role="Engineering Student"
              rating={5}
            />
            
            <TestimonialCard
              quote="As an educator, I'm impressed by how this platform adapts to different learning styles. My students are more engaged and their performance has improved significantly."
              author="Dr. Emily Rodriguez"
              role="Professor"
              rating={5}
            />
          </div>
        </div>
      </section>      {/* Final CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-black to-neutral-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Transform Your Learning?</h2>
          <p className="text-xl text-neutral-400 mb-8">
            Join thousands of students and educators who are already experiencing the future of learning.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="bg-white text-black hover:bg-neutral-200 hover:text-black px-8 py-4 rounded-lg font-semibold text-lg transform hover:scale-105 transition-all duration-300"
            >
              Get Started Today
            </button>
            <button 
              onClick={() => window.open('mailto:contact@adhyayan.ai?subject=Schedule Demo', '_blank')}
              className="border border-neutral-600 hover:border-neutral-400 text-neutral-300 hover:text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300"
            >
              Schedule Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <ProfessionalFooter />
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
}

const FeatureCard = ({ icon, title, description, features }: FeatureCardProps) => {
  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-800/10 to-neutral-900/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
      <div className="relative bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-8 hover:border-neutral-600 transition-all duration-300">
        <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} />
        
        <div className="text-neutral-400 mb-6">{icon}</div>
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        <p className="text-neutral-400 mb-6 leading-relaxed">{description}</p>
        
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm text-neutral-300">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const StepCard = ({ number, title, description, icon }: StepCardProps) => {
  return (
    <div className="text-center group">
      <div className="relative mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-neutral-800 border-2 border-white rounded-full flex items-center justify-center text-xs font-bold text-white">
          {number}
        </div>
      </div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="text-neutral-400 leading-relaxed">{description}</p>
    </div>
  );
};

interface TechFeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const TechFeature = ({ icon, title, description }: TechFeatureProps) => {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center text-neutral-400 flex-shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold mb-2">{title}</h4>
        <p className="text-neutral-400 text-sm">{description}</p>
      </div>
    </div>
  );
};

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  rating: number;
}

const TestimonialCard = ({ quote, author, role, rating }: TestimonialCardProps) => {
  return (
    <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6 hover:border-neutral-600 transition-all duration-300">
      <div className="flex mb-4">
        {[...Array(rating)].map((_, i) => (
          <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
        ))}
      </div>
      <p className="text-neutral-300 mb-6 leading-relaxed">"{quote}"</p>
      <div>
        <div className="font-semibold">{author}</div>
        <div className="text-sm text-neutral-400">{role}</div>
      </div>
    </div>
  );
};

// Upload icon component
const Upload = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);
