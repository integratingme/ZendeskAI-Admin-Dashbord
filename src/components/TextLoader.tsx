'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type TextLoaderProps = {
  text?: string;          // default "IndeskAI"
  typingSpeedMs?: number; // per character
  fullscreen?: boolean;   // overlay vs inline
  className?: string;     // optional extra styles
};

export default function TextLoader({
  text = 'IndeskAI',
  typingSpeedMs = 80,
  fullscreen = false,
  className = '',
}: TextLoaderProps) {
  const [idx, setIdx] = useState(0);
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  }, []);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIdx(text.length);
      return;
    }
    setIdx(0);
    intervalRef.current = window.setInterval(() => {
      setIdx((i) => {
        if (i >= text.length) {
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return i;
        }
        return i + 1;
      });
    }, typingSpeedMs);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [text, typingSpeedMs, prefersReducedMotion]);

  const content = (
    <div
      className={`flex items-center ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{ fontFamily: 'var(--font-maven-pro), system-ui, sans-serif' }}
    >
      <span className="text-loader-dot" aria-hidden="true" />
      <span
        style={{ color: 'var(--foreground)' }}
        className="font-medium tracking-wide"
      >
        {text.slice(0, idx)}
      </span>
      <span className="text-loader-caret" aria-hidden="true" />
    </div>
  );

  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'var(--background)' }}
      >
        {content}
      </div>
    );
  }

  return content;
}
