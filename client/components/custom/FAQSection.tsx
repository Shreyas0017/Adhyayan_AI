'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const faqs = [
  {
    question: "What is Adhyayan AI and how does it work?",
    answer: "Adhyayan AI is an intelligent learning platform that uses artificial intelligence to create personalized study paths, adaptive assessments, and interactive learning experiences. Our AI analyzes your learning patterns, strengths, and areas for improvement to deliver customized educational content that maximizes your learning efficiency."
  },
  {
    question: "How does the AI personalization feature work?",
    answer: "Our AI engine continuously analyzes your learning behavior, quiz performance, and engagement patterns to understand your unique learning style. It then adapts the content difficulty, suggests optimal study schedules, and recommends resources that match your pace and preferences, ensuring maximum retention and understanding."
  },
  {
    question: "What subjects and topics are available on the platform?",
    answer: "Adhyayan AI covers a comprehensive range of subjects including Mathematics, Science, Technology, Languages, Business, and more. Our content library is constantly expanding with new courses and learning materials added regularly. We also support custom curriculum creation for educational institutions."
  },
  {
    question: "Is my learning data secure and private?",
    answer: "Absolutely. We prioritize your privacy and data security with industry-standard encryption, secure data storage, and strict privacy policies. Your learning data is used solely to improve your educational experience and is never shared with third parties without your explicit consent."
  },
  {
    question: "Can I track my learning progress and performance?",
    answer: "Yes! Our platform provides detailed analytics and progress tracking features. You can monitor your learning journey through comprehensive dashboards that show completion rates, skill improvements, time spent studying, and performance trends across different subjects and topics."
  },
  {
    question: "Do you offer support for educators and institutions?",
    answer: "We provide specialized tools for educators including classroom management features, student progress monitoring, curriculum customization, and detailed analytics. Educational institutions can also access bulk licensing, integration support, and dedicated account management."
  }
];

export function FAQSection() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Frequently Asked Questions
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Get answers to common questions about Adhyayan AI and our learning platform.
        </p>
      </div>
      
      <div className="space-y-2">
        {faqs.map((faq, index) => {
          const isOpen = openItems.has(index);
          return (
            <div
              key={index}
              className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md"
            >
              {/* Question Button - Fixed Height */}
              <button
                onClick={() => toggleItem(index)}
                className="flex w-full justify-between items-center px-6 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent/30 transition-colors duration-200 group min-h-[80px]"
              >
                <span className="text-lg font-semibold text-foreground pr-4 group-hover:text-primary transition-colors duration-200 leading-tight">
                  {faq.question}
                </span>
                <ChevronDownIcon
                  className={clsx(
                    'h-5 w-5 text-muted-foreground transition-all duration-300 ease-out flex-shrink-0',
                    isOpen ? 'rotate-180 text-primary' : 'rotate-0',
                    'group-hover:text-primary'
                  )}
                />
              </button>
              
              {/* Answer Panel - Smooth Height Transition */}
              <div
                className={clsx(
                  'overflow-hidden transition-all duration-500 ease-in-out',
                  isOpen ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
                )}
                style={{
                  transitionProperty: 'max-height, opacity, padding',
                  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div className={clsx(
                  'transition-all duration-500 ease-in-out',
                  isOpen ? 'px-6 pb-6 pt-0' : 'px-6 pb-0 pt-0'
                )}>
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4"></div>
                  <div className="text-muted-foreground leading-relaxed text-base">
                    {faq.answer}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-12 text-center">
        <p className="text-muted-foreground">
          Still have questions?{' '}
          <a href="#contact" className="text-primary hover:text-primary/80 font-medium">
            Contact our support team
          </a>
        </p>
      </div>
    </div>
  );
}
