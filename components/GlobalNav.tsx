"use client";

import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

export type GlobalTab = 'home' | 'gallery' | 'floor' | 'virtual' | 'map';

interface GlobalNavProps {
  activeTab: GlobalTab;
  onSelectTab: (tab: GlobalTab) => void;
}

export const GlobalNav: React.FC<GlobalNavProps> = ({ activeTab, onSelectTab }) => {
  const touchStartX = useRef<number | null>(null);
  const dialRef = useRef<HTMLDivElement>(null);

  const tabs: { id: GlobalTab, label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'floor', label: 'Floor' },
    { id: 'virtual', label: 'Virtual Space' },
    { id: 'map', label: 'Map' }
  ];

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  useEffect(() => {
    if (dialRef.current) {
      const activeText = dialRef.current.querySelector('.dial-item-active .dial-text');
      if (activeText) {
         gsap.fromTo(activeText, 
           { scale: 0.95 }, 
           { scale: 1, duration: 0.6, ease: "power2.out" }
         );
      }
    }
  }, [activeIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (dialRef.current && dialRef.current.contains(e.target as Node)) {
      touchStartX.current = null;
      return;
    }
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 40) { 
      if (diff > 0 && activeIndex < tabs.length - 1) {
        onSelectTab(tabs[activeIndex + 1].id);
      } else if (diff < 0 && activeIndex > 0) {
        onSelectTab(tabs[activeIndex - 1].id);
      }
    }
    touchStartX.current = null;
  };

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 z-40 flex justify-center pb-8 md:pb-12 touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      <div 
        ref={dialRef} 
        className="relative z-10 flex items-center gap-6 md:gap-12 px-8 py-4 bg-black/20 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.3)] max-w-[90vw] overflow-x-auto scrollbar-hide"
      >
          {tabs.map((tab, index) => {
            const isActive = index === activeIndex;

            return (
              <button 
                key={tab.id} 
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center transition-all duration-500 ease-out shrink-0 group ${isActive ? 'dial-item-active' : ''}`}
                style={{ pointerEvents: 'auto' }}
              >
                <span 
                  className={`dial-text text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase whitespace-nowrap transition-colors duration-500 inline-block pb-2 ${
                    isActive 
                      ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' 
                      : 'text-white/40 group-hover:text-white/80'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
};
