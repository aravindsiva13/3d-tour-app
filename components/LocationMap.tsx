"use client";

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from '@/lib/types';
import { X, Map as MapIcon } from 'lucide-react';
import gsap from 'gsap';

const MapCanvas = dynamic(() => import('./MapCanvas'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm font-bold uppercase tracking-widest">Loading map...</div>
});

interface LocationMapProps {
  pins: MapPin[];
  onClose: () => void;
}

const MagneticWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => {
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
      
      gsap.to(el, { x: x * 0.4, y: y * 0.4, duration: 0.4, ease: "power2.out" });
    };

    const leave = () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" });
    };

    el.addEventListener("mousemove", move as EventListener);
    el.addEventListener("mouseleave", leave as EventListener);

    return () => {
      el.removeEventListener("mousemove", move as EventListener);
      el.removeEventListener("mouseleave", leave as EventListener);
    };
  }, []);

  return <div ref={ref} className={className}>{children}</div>;
};

export const LocationMap: React.FC<LocationMapProps> = ({ pins, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      const tl = gsap.timeline();
      tl.fromTo(containerRef.current, 
        { opacity: 0, backdropFilter: 'blur(0px)' }, 
        { opacity: 1, backdropFilter: 'blur(8px)', duration: 0.6, ease: 'power2.out', force3D: true }
      );
      tl.fromTo('.landmark-item',
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out', force3D: true },
        "-=0.2"
      );
    }
  }, []);

  // 3D Parallax Tilt for Sidebar
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = sidebar.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

      gsap.to(sidebar, {
        rotationY: x * 6,
        rotationX: -y * 6,
        ease: "power2.out",
        duration: 0.5,
        transformPerspective: 1000,
        transformOrigin: "center center",
        force3D: true
      });
    };

    const handleMouseLeave = () => {
      gsap.to(sidebar, { rotationY: 0, rotationX: 0, ease: "elastic.out(1, 0.3)", duration: 1 });
    };

    sidebar.addEventListener('mousemove', handleMouseMove);
    sidebar.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      sidebar.removeEventListener('mousemove', handleMouseMove);
      sidebar.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleClose = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        backdropFilter: 'blur(0px)',
        duration: 0.4,
        ease: 'power2.in',
        onComplete: onClose
      });
    } else {
      onClose();
    }
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-[rgba(11,10,8,0.35)] flex flex-col pointer-events-auto">
      
      {/* Top Header & Close */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-8 flex justify-between items-center z-20 pointer-events-none">
        <div className="bg-[rgba(246,231,188,0.08)] backdrop-blur-2xl px-6 py-3 rounded-full border border-[rgba(201,169,97,0.28)] shadow-[inset_0_1px_1px_rgba(246,231,188,0.2)] pointer-events-auto">
          <span className="text-[var(--gold-200)] font-medium tracking-[0.18em] text-sm uppercase">Location Map</span>
        </div>
        
        <MagneticWrapper className="pointer-events-auto">
          <button 
            onClick={handleClose}
            className="group p-3 rounded-full bg-[rgba(246,231,188,0.08)] text-white hover:bg-[var(--gold-300)] hover:text-[#1A150B] backdrop-blur-2xl border border-[rgba(201,169,97,0.28)] shadow-[inset_0_1px_1px_rgba(246,231,188,0.2)] transition-colors"
          >
            <X size={20} className="transition-transform duration-500 group-hover:rotate-90" />
          </button>
        </MagneticWrapper>
      </div>

      <div className="flex-1 w-full h-full relative p-4 md:p-8 pt-24 md:pt-28 pb-4 md:pb-8 flex flex-col md:flex-row gap-4 md:gap-8 max-w-[1600px] mx-auto">
        {/* Legend Sidebar */}
        <div ref={sidebarRef} className="w-full md:w-[350px] shrink-0 bg-[rgba(11,10,8,0.25)] backdrop-blur-3xl border border-[rgba(201,169,97,0.18)] shadow-[0_30px_60px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(246,231,188,0.2)] rounded-3xl p-5 md:p-6 flex flex-col relative z-10 overflow-hidden max-h-[35vh] md:max-h-none">
          <div className="flex items-center gap-3 mb-4 md:mb-6 pb-3 md:pb-4 border-b border-[rgba(201,169,97,0.18)]">
            <MapIcon size={20} className="text-white/80 shrink-0" />
            <h3 className="text-white font-bold tracking-widest uppercase text-xs md:text-sm">Nearby Landmarks</h3>
          </div>
          
          <ul className="flex flex-col gap-3 md:gap-4 overflow-y-auto pr-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {Object.entries(
              pins.reduce((acc, pin) => {
                const cat = pin.category || 'Other';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(pin);
                return acc;
              }, {} as Record<string, typeof pins>)
            ).map(([category, categoryPins]) => (
              <div key={category} className="mb-2">
                <h4 className="text-white/60 font-semibold text-[10px] md:text-xs tracking-[0.2em] uppercase mb-3 ml-1">{category}</h4>
                <div className="flex flex-col gap-3 md:gap-4">
                  {categoryPins.map((pin) => {
                    const globalIndex = pins.indexOf(pin);
                    return (
                      <li 
                        key={pin.id} 
                        className="landmark-item flex justify-between items-center group cursor-pointer"
                        onMouseEnter={(e) => {
                          setHoveredPinId(pin.id);
                          gsap.to(e.currentTarget, { x: 5, scale: 1.02, duration: 0.3, ease: 'power2.out' });
                        }}
                        onMouseLeave={(e) => {
                          setHoveredPinId(null);
                          gsap.to(e.currentTarget, { x: 0, scale: 1, duration: 0.4, ease: 'power2.out' });
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 md:w-6 md:h-6 shrink-0 rounded-full border flex items-center justify-center text-[9px] md:text-[10px] font-bold transition-colors ${hoveredPinId === pin.id ? 'bg-[var(--gold-300)] text-[#1A150B] border-[var(--gold-100)]' : 'bg-[rgba(246,231,188,0.08)] border-[rgba(201,169,97,0.28)] text-white group-hover:bg-[var(--gold-300)] group-hover:text-[#1A150B] group-hover:border-[var(--gold-100)]'}`}>
                            {globalIndex + 1}
                          </div>
                          <span className={`text-xs md:text-sm font-medium transition-colors ${hoveredPinId === pin.id ? 'text-[var(--gold-200)]' : 'text-white/80 group-hover:text-[var(--gold-200)]'}`}>{pin.label}</span>
                        </div>
                        <span className={`text-[10px] md:text-xs font-bold tracking-wider transition-colors whitespace-nowrap ml-2 ${hoveredPinId === pin.id ? 'text-[var(--gold-300)]' : 'text-[rgba(201,169,97,0.6)] group-hover:text-[var(--gold-300)]'}`}>{pin.driveTime}</span>
                      </li>
                    );
                  })}
                </div>
              </div>
            ))}
          </ul>
        </div>
        
        {/* Interactive Map */}
        <div className="flex-1 bg-[rgba(246,231,188,0.05)] rounded-3xl border border-[rgba(201,169,97,0.18)] overflow-hidden relative shadow-inner">
          <MapCanvas pins={pins} hoveredPinId={hoveredPinId} />
        </div>
      </div>
    </div>
  );
};
