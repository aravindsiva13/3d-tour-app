"use client";

import React, { useState, useRef, useEffect } from 'react';
import { GalleryConfig } from '@/lib/types';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import gsap from 'gsap';

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

interface GalleryOverlayProps {
  gallery: GalleryConfig;
  onClose: () => void;
}

type GalleryTab = 'interior' | 'exterior';

export const GalleryOverlay: React.FC<GalleryOverlayProps> = ({ gallery, onClose }) => {
  const [activeTab, setActiveTab] = useState<GalleryTab>('exterior');
  const [currentIndex, setCurrentIndex] = useState(0);
  const prevIndexRef = useRef(0);
  const [isClosing, setIsClosing] = useState(false);

  const images = gallery[activeTab] || [];
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when tab changes
  useEffect(() => {
    setCurrentIndex(0);
    prevIndexRef.current = 0;

    const timeout = setTimeout(() => {
      const firstImage = imageRefs.current[0];
      if (firstImage) {
        gsap.fromTo(firstImage,
          { opacity: 0, scale: 1.05 },
          { opacity: 1, scale: 1, duration: 1, ease: 'power2.out' }
        );
      }
    }, 50);

    return () => clearTimeout(timeout);
  }, [activeTab]);

  // Initial Mount Animation
  useEffect(() => {
    if (containerRef.current && !isClosing) {
      const tl = gsap.timeline();
      
      tl.fromTo(containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: 'power2.out' }
      );

      const firstImage = imageRefs.current[currentIndex];
      if (firstImage) {
        tl.fromTo(firstImage,
          { scale: 1.15, opacity: 0 },
          { scale: 1, opacity: 1, duration: 1.2, ease: 'power3.out' },
          "<"
        );
      }

      tl.fromTo('.gsap-ui',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' },
        '-=0.8'
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

    const currentImage = imageRefs.current[currentIndex];
    if (currentImage) {
      tl.to(currentImage, { scale: 0.95, opacity: 0, duration: 0.5, ease: 'power2.in' }, "-=0.2");
    }

    tl.to(containerRef.current, { opacity: 0, duration: 0.4, ease: 'power2.in' }, "-=0.3");
  };

  // Image Transition Animation
  useEffect(() => {
    if (isClosing) return;
    if (prevIndexRef.current !== currentIndex) {
      const prevEl = imageRefs.current[prevIndexRef.current];
      const nextEl = imageRefs.current[currentIndex];

      if (prevEl) {
        gsap.to(prevEl, { opacity: 0, duration: 1, ease: "power2.inOut" });
        gsap.set(prevEl, { zIndex: 0 });
      }
      if (nextEl) {
        gsap.set(nextEl, { zIndex: 1 });
        gsap.fromTo(nextEl, 
          { opacity: 0, scale: 1.05 },
          { opacity: 1, scale: 1, duration: 1, ease: "power2.out" }
        );
      }
      prevIndexRef.current = currentIndex;
    }
  }, [currentIndex, isClosing]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isClosing) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setCurrentIndex(prev => Math.min(images.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [images.length, isClosing]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-50 flex bg-black opacity-0">
      
      {/* Fullscreen Background Images */}
      {images.map((imgSrc, idx) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img 
          key={imgSrc + activeTab} // force re-render when tab changes
          ref={(el) => { imageRefs.current[idx] = el; }}
          src={imgSrc} 
          alt={`Gallery View ${idx + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ 
            opacity: 0,
            zIndex: idx === currentIndex ? 1 : 0 
          }}
        />
      ))}
      
      {images.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm tracking-widest uppercase z-10">
          No images available
        </div>
      )}

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-20 pointer-events-none gsap-ui">
        <div className="bg-white/10 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] pointer-events-auto">
          <span className="text-white font-medium tracking-wide text-sm uppercase">Gallery</span>
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

      {/* Pill Menu (Left on desktop, Right on mobile) */}
      {images.length > 1 && (
        <div className="absolute md:left-12 right-6 md:right-auto top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-4 md:gap-6 w-max">
          <button className="gsap-ui text-white/70 hover:text-white transition-colors drop-shadow-md" onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}>
            <ChevronUp size={28} />
          </button>
          
          <div className="gsap-ui bg-white/10 backdrop-blur-2xl rounded-full p-2 flex flex-col gap-2 border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] max-h-[50vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {images.map((_, idx) => (
              <button 
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-[48px] h-[48px] md:w-[60px] md:h-[60px] rounded-full flex flex-col items-center justify-center shrink-0 transition-all duration-300 ${
                  currentIndex === idx 
                    ? 'bg-white/20 border border-white/30 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]' 
                    : 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-[8px] md:text-[9px] uppercase font-bold tracking-widest leading-none mb-1">View</span>
                <span className="text-lg md:text-xl font-light leading-none">{idx + 1}</span>
              </button>
            ))}
          </div>

          <button className="gsap-ui text-white/70 hover:text-white transition-colors drop-shadow-md" onClick={() => setCurrentIndex(prev => Math.min(images.length - 1, prev + 1))}>
            <ChevronDown size={28} />
          </button>
        </div>
      )}

      {/* Bottom Tabs (Interior / Exterior) */}
      <div className="absolute bottom-0 left-0 right-0 z-40 flex justify-center pb-8 md:pb-12 pointer-events-auto">
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-6 md:gap-12 px-8 py-4 bg-black/20 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <button
            onClick={() => setActiveTab('interior')}
            className={`relative flex flex-col items-center justify-center transition-all duration-500 ease-out shrink-0 group`}
          >
            <span className={`text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase whitespace-nowrap transition-colors duration-500 inline-block pb-2 ${activeTab === 'interior' ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'text-white/40 group-hover:text-white/80'}`}>
              Interior
            </span>

          </button>
          
          <button
            onClick={() => setActiveTab('exterior')}
            className={`relative flex flex-col items-center justify-center transition-all duration-500 ease-out shrink-0 group`}
          >
            <span className={`text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase whitespace-nowrap transition-colors duration-500 inline-block pb-2 ${activeTab === 'exterior' ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'text-white/40 group-hover:text-white/80'}`}>
              Exterior
            </span>

          </button>
        </div>
      </div>

    </div>
  );
};
