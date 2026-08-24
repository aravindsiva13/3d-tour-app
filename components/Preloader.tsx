"use client";

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface PreloaderProps {
  isReady: boolean;
  onComplete: () => void;
}

export const Preloader: React.FC<PreloaderProps> = ({ isReady, onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef({ val: 0 });
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    // Start fake loading up to 85%
    tweenRef.current = gsap.to(progressRef.current, {
      val: 85,
      duration: 3,
      ease: "power1.out",
      onUpdate: () => {
        if (counterRef.current) {
          counterRef.current.innerText = Math.round(progressRef.current.val) + "%";
        }
      }
    });

    return () => {
      if (tweenRef.current) tweenRef.current.kill();
    };
  }, []);

  useEffect(() => {
    if (isReady) {
      if (tweenRef.current) tweenRef.current.kill();
      
      // Accelerate to 100% and trigger exit
      gsap.to(progressRef.current, {
        val: 100,
        duration: 0.6,
        ease: "power2.inOut",
        onUpdate: () => {
          if (counterRef.current) {
            counterRef.current.innerText = Math.round(progressRef.current.val) + "%";
          }
        },
        onComplete: () => {
          // Dissolve out
          gsap.to(containerRef.current, {
            opacity: 0,
            scale: 1.05,
            duration: 0.8,
            ease: "power3.inOut",
            onComplete: onComplete
          });
        }
      });
    }
  }, [isReady, onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
    >
      <div className="relative flex flex-col items-center gap-6 px-6 text-center">
        <div className="text-[10px] uppercase tracking-[0.5em] font-bold text-white/40">
          Loading Experience
        </div>
        <div
          ref={counterRef}
          className="text-white text-6xl sm:text-7xl md:text-8xl font-light tracking-tighter tabular-nums"
        >
          0%
        </div>
        <div className="w-40 sm:w-56 h-px bg-white/20" />

        <p className="text-[11px] sm:text-xs tracking-[0.28em] uppercase text-white/50 font-light">
          Your DCC property is loading
          <span className="inline-block ml-[2px] animate-pulse">...</span>
        </p>
      </div>
    </div>
  );
};
