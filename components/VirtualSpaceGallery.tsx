"use client";

import React, { useEffect, useRef, useState } from 'react';
import { VirtualTourNode } from '@/lib/types';
import { X } from 'lucide-react';
import gsap from 'gsap';

interface VirtualSpaceGalleryProps {
  nodes: Record<string, VirtualTourNode>;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const MagneticWrapper: React.FC<{ children: React.ReactNode, className?: string, strength?: number }> = ({ children, className = "", strength = 0.4 }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const move = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const h = rect.width / 2;
      const w = rect.height / 2;
      const x = e.clientX - rect.left - h;
      const y = e.clientY - rect.top - w;
      
      gsap.to(el, { x: x * strength, y: y * strength, duration: 0.4, ease: "power2.out" });
    };

    const leave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" });
    };

    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);

    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, [strength]);

  return <div ref={ref} className={className}>{children}</div>;
};

export const VirtualSpaceGallery: React.FC<VirtualSpaceGalleryProps> = ({ nodes, onSelect, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);

  const nodeEntries = Object.entries(nodes);

  // Initial Mount Animation
  useEffect(() => {
    if (containerRef.current && !isClosing) {
      const tl = gsap.timeline();
      
      tl.fromTo(containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: 'power2.out' }
      );

      tl.fromTo('.gsap-ui',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' },
        '-=0.4'
      );
      
      tl.fromTo('.gallery-card',
        { opacity: 0, y: 30, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.05, ease: 'power2.out' },
        '-=0.3'
      );
    }
  }, [isClosing]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);

    const tl = gsap.timeline({
      onComplete: onClose
    });

    tl.to('.gsap-ui', { opacity: 0, y: -10, duration: 0.3, stagger: 0.05, ease: 'power2.in' });
    tl.to('.gallery-card', { opacity: 0, scale: 0.95, duration: 0.3, stagger: 0.02, ease: 'power2.in' }, "-=0.2");
    tl.to(containerRef.current, { opacity: 0, duration: 0.4, ease: 'power2.in' }, "-=0.1");
  };
  
  const handleSelect = (id: string) => {
    if (isClosing) return;
    setIsClosing(true);

    const tl = gsap.timeline({
      onComplete: () => onSelect(id)
    });
    
    tl.to('.gsap-ui', { opacity: 0, y: -10, duration: 0.3, stagger: 0.05, ease: 'power2.in' });
    tl.to('.gallery-card', { opacity: 0, scale: 1.05, duration: 0.4, stagger: 0.02, ease: 'power2.in' }, "-=0.2");
    tl.to(containerRef.current, { opacity: 0, duration: 0.4, ease: 'power2.in' }, "-=0.1");
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isClosing) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isClosing]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-xl opacity-0 overflow-y-auto">
      
      {/* Top Controls */}
      <div className="sticky top-0 left-0 right-0 p-8 flex justify-between items-center z-20 pointer-events-none gsap-ui">
        <div className="bg-white/10 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] pointer-events-auto">
          <span className="text-white font-medium tracking-wide text-sm uppercase">Virtual Space</span>
        </div>
        
        <MagneticWrapper className="pointer-events-auto">
          <button 
            onClick={handleClose}
            className="group p-3 rounded-full bg-white/10 text-white hover:bg-white hover:text-black backdrop-blur-2xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] transition-colors"
          >
            <X size={20} className="transition-transform duration-500 group-hover:rotate-90" />
          </button>
        </MagneticWrapper>
      </div>

      {/* Grid of Panoramas */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-12 pb-24 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {nodeEntries.map(([id, node]) => (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              className="gallery-card group relative aspect-[3/2] rounded-3xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/30 transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] text-left focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {/* Background Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={node.src} 
                alt={node.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Text Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                <span className="block text-[10px] md:text-xs text-white/60 tracking-[0.2em] uppercase font-bold mb-2">
                  360&deg; View
                </span>
                <h3 className="text-white text-xl md:text-2xl font-light tracking-wide">
                  {node.name}
                </h3>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
