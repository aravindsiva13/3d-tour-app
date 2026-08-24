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
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[rgba(6,6,5,0.8)] to-transparent pointer-events-none" />

      <div
        ref={dialRef}
        /* py-5 (not py-4): the labels used to carry an 8px pb-2 to clear the
           underline, so dropping that would have shortened the pill by 8px.
           16+8+16 -> 20+0+20 keeps the bar exactly the same height, with the
           space now split evenly above and below the text. */
        className="relative z-10 flex items-center gap-6 md:gap-10 px-6 md:px-8 py-5 bg-[rgba(11,10,8,0.55)] backdrop-blur-xl border border-[rgba(201,169,97,0.28)] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(246,231,188,0.18)] max-w-[92vw] overflow-x-auto scrollbar-hide"
      >
          {tabs.map((tab, index) => {
            const isActive = index === activeIndex;

            return (
              <button 
                key={tab.id} 
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex items-center justify-center transition-all duration-500 ease-out shrink-0 group ${isActive ? 'dial-item-active' : ''}`}
                style={{ pointerEvents: 'auto' }}
              >
                <span
                  className={`dial-text text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase whitespace-nowrap transition-colors duration-500 inline-block ${
                    isActive
                      ? 'text-[var(--gold-200)] drop-shadow-[0_0_10px_rgba(201,169,97,0.55)]'
                      : 'text-[rgba(243,240,233,0.45)] group-hover:text-[var(--gold-300)]'
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
