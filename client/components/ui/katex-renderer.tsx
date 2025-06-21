"use client";
import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface KatexRendererProps {
  math: string;
  block?: boolean;
  className?: string;
}

export function KatexRenderer({ math, block = false, className = '' }: KatexRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: block,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false,
        });
      } catch (error) {
        console.error('KaTeX rendering error:', error);
        if (containerRef.current) {
          containerRef.current.textContent = math;
        }
      }
    }
  }, [math, block]);

  return (
    <span 
      ref={containerRef} 
      className={`katex-container ${className}`}
      style={{ color: 'white' }}
    />
  );
}
