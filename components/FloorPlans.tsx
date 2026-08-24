"use client";

import React, { useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { FloorPlan, FloorPlanHotspot } from '@/lib/types';
import { X, ZoomIn, ZoomOut, Focus, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import gsap from 'gsap';

interface FloorPlansProps {
  plans: FloorPlan[];
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

const TiltWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const move = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      
      gsap.to(el, { 
        rotationY: x * 6, 
        rotationX: -y * 6, 
        duration: 0.5, 
        ease: "power2.out",
        transformPerspective: 1000,
        transformOrigin: "center center"
      });
    };

    const leave = () => {
      gsap.to(el, { rotationY: 0, rotationX: 0, duration: 1, ease: "elastic.out(1, 0.3)" });
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

export const FloorPlans: React.FC<FloorPlansProps> = ({ plans, onClose }) => {
  const [activePlanId, setActivePlanId] = useState(plans[0]?.id);
  const [activeHotspot, setActiveHotspot] = useState<FloorPlanHotspot | null>(null);
  const [hotspotImageIndex, setHotspotImageIndex] = useState(0);
  const [isClosingHotspot, setIsClosingHotspot] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const detailsRef = useRef<HTMLDListElement>(null);
  
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const hotspotImageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const prevHotspotIndexRef = useRef(0);

  // Main container entrance animation
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current, 
        { opacity: 0, backdropFilter: 'blur(0px)' }, 
        { opacity: 1, backdropFilter: 'blur(8px)', duration: 0.6, ease: 'power2.out' }
      );
    }
  }, []);

  // Cinematic Blueprint Transition & Details Ticker
  useEffect(() => {
    if (imgRef.current) {
      gsap.fromTo(imgRef.current,
        { opacity: 0, scale: 1.05 },
        { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" }
      );
    }
    if (detailsRef.current) {
      const dds = detailsRef.current.querySelectorAll('dd');
      gsap.fromTo(dds,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: "power2.out" }
      );
    }
  }, [activePlanId]);

  useEffect(() => {
    setActiveHotspot(null);
    setHotspotImageIndex(0);
    setIsClosingHotspot(false);
  }, [activePlanId]);

  // Hotspot modal entry animation
  useEffect(() => {
    if (activeHotspot && !isClosingHotspot) {
      if (modalContainerRef.current && modalContentRef.current) {
        const tl = gsap.timeline();
        tl.fromTo(modalContainerRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.4, ease: 'power2.out' }
        );
        tl.fromTo(modalContentRef.current,
          { opacity: 0, scale: 0.95, y: 20 },
          { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'power3.out' },
          "<0.1"
        );
      }
      prevHotspotIndexRef.current = hotspotImageIndex;
    }
  }, [activeHotspot, isClosingHotspot]);

  // Hotspot image crossfade animation
  useEffect(() => {
    if (activeHotspot && !isClosingHotspot) {
      if (prevHotspotIndexRef.current !== hotspotImageIndex) {
        const prevImg = hotspotImageRefs.current[prevHotspotIndexRef.current];
        const nextImg = hotspotImageRefs.current[hotspotImageIndex];
        
        if (prevImg) {
          gsap.to(prevImg, { opacity: 0, duration: 0.8, ease: "power2.inOut" });
          gsap.set(prevImg, { zIndex: 0 });
        }
        if (nextImg) {
          gsap.set(nextImg, { zIndex: 1 });
          gsap.fromTo(nextImg, 
            { opacity: 0, scale: 1.05 },
            { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" }
          );
        }
        prevHotspotIndexRef.current = hotspotImageIndex;
      }
    }
  }, [hotspotImageIndex, activeHotspot, isClosingHotspot]);

  const handleCloseHotspot = () => {
    if (isClosingHotspot) return;
    setIsClosingHotspot(true);
    const tl = gsap.timeline({
      onComplete: () => {
        setActiveHotspot(null);
        setIsClosingHotspot(false);
      }
    });
    if (modalContentRef.current) {
      tl.to(modalContentRef.current, { opacity: 0, scale: 0.95, y: 10, duration: 0.3, ease: 'power2.in' });
    }
    if (modalContainerRef.current) {
      tl.to(modalContainerRef.current, { opacity: 0, duration: 0.3, ease: 'power2.in' }, "<0.1");
    }
  };

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

  if (!plans.length) return null;

  const activePlan = plans.find(p => p.id === activePlanId) || plans[0];

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-[rgba(11,10,8,0.35)] flex flex-col pointer-events-auto">
      
      {/* Top Header & Close */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-8 flex justify-between items-center z-20">
        <div className="bg-[rgba(246,231,188,0.08)] backdrop-blur-2xl px-6 py-3 rounded-full border border-[rgba(201,169,97,0.28)] shadow-[inset_0_1px_1px_rgba(246,231,188,0.2)]">
          <span className="text-[var(--gold-200)] font-medium tracking-[0.18em] text-sm uppercase">Floor Plans</span>
        </div>
        
        <MagneticWrapper>
          <button 
            onClick={handleClose}
            className="group p-3 rounded-full bg-[rgba(246,231,188,0.08)] text-white hover:bg-[var(--gold-300)] hover:text-[#1A150B] backdrop-blur-2xl border border-[rgba(201,169,97,0.28)] shadow-[inset_0_1px_1px_rgba(246,231,188,0.2)] transition-colors"
          >
            <X size={20} className="transition-transform duration-500 group-hover:rotate-90" />
          </button>
        </MagneticWrapper>
      </div>

      <div className="flex-1 w-full h-full relative pt-36 md:pt-24 pb-4 md:pb-8 px-4 md:px-8 flex flex-col">
        {/* Architectural List (Vertical on Desktop, Horizontal Scroll on Mobile) */}
        <div className="absolute left-0 md:left-8 top-20 md:top-[35%] md:-translate-y-1/2 z-20 pointer-events-auto flex flex-row md:flex-col w-full md:w-auto overflow-x-auto md:overflow-x-visible scrollbar-hide px-4 md:px-0 gap-6">
          {plans.map(plan => (
            <button 
              key={plan.id}
              onClick={() => setActivePlanId(plan.id)}
              className="group flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 text-center md:text-left transition-all duration-500 ease-out shrink-0"
            >
              {/* Glowing Indicator Line */}
              <div 
                className={`transition-all duration-500 ease-out ${
                  activePlanId === plan.id 
                    ? 'w-8 h-[2px] md:w-[2px] md:h-8 bg-[var(--gold-300)] shadow-[0_0_12px_rgba(246,231,188,0.8)]' 
                    : 'w-4 h-[2px] md:w-[2px] md:h-4 bg-[rgba(246,231,188,0.14)] group-hover:bg-[rgba(246,231,188,0.32)] group-hover:w-6 md:group-hover:h-6'
                }`}
              />
              {/* Animated Text */}
              <span 
                className={`text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase transition-all duration-500 whitespace-nowrap ${
                  activePlanId === plan.id 
                    ? 'text-white md:scale-105 origin-left drop-shadow-md' 
                    : 'text-white/40 group-hover:text-white/70'
                }`}
              >
                {plan.name}
              </span>
            </button>
          ))}
        </div>
        
        {/* Details Panel */}
        <TiltWrapper className="absolute left-4 right-4 md:left-8 md:right-auto bottom-4 md:bottom-8 z-20 pointer-events-auto">
          <div className="bg-[rgba(246,231,188,0.08)] backdrop-blur-2xl border border-[rgba(201,169,97,0.28)] rounded-3xl p-5 md:p-7 text-white shadow-[0_20px_40px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(246,231,188,0.2)]">
            <dl ref={detailsRef} className="flex flex-row md:flex-col justify-between gap-2 md:gap-5">
              <div className="flex flex-col items-center md:items-start">
                <dt className="text-white/60 text-[8px] md:text-[10px] font-bold tracking-widest uppercase mb-1">Carpet Area</dt>
                <dd className="text-lg md:text-2xl font-light tracking-wide">{activePlan.carpetArea}</dd>
              </div>
              <div className="flex flex-col items-center md:items-start">
                <dt className="text-white/60 text-[8px] md:text-[10px] font-bold tracking-widest uppercase mb-1">Built-up Area</dt>
                <dd className="text-lg md:text-2xl font-light tracking-wide">{activePlan.builtUpArea}</dd>
              </div>
              <div className="flex flex-col items-center md:items-start">
                <dt className="text-white/60 text-[8px] md:text-[10px] font-bold tracking-widest uppercase mb-1">Facing</dt>
                <dd className="text-lg md:text-2xl font-light tracking-wide">{activePlan.facing}</dd>
              </div>
            </dl>
          </div>
        </TiltWrapper>

        {/* Pan/Zoom Viewer */}
        <div className="flex-1 bg-[rgba(246,231,188,0.05)] rounded-3xl border border-[rgba(201,169,97,0.18)] overflow-hidden relative shadow-inner flex items-center justify-center">
          <TransformWrapper
            key={activePlanId}
            initialScale={1}
            minScale={0.5}
            maxScale={4}
            centerOnInit
            doubleClick={{ mode: 'zoomIn' }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                {/* Unified Vertical Zoom Controls */}
                <div className="absolute right-4 md:right-8 bottom-32 md:bottom-8 z-20 pointer-events-auto">
                  <div className="flex flex-col bg-[rgba(246,231,188,0.05)] backdrop-blur-3xl border border-[rgba(201,169,97,0.28)] rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(246,231,188,0.3)] overflow-hidden">
                    <button 
                      className="w-12 h-12 flex items-center justify-center text-white hover:bg-[rgba(246,231,188,0.14)] active:bg-[rgba(246,231,188,0.26)] transition-colors border-b border-[rgba(201,169,97,0.18)]" 
                      onClick={() => zoomIn()}
                    >
                      <ZoomIn size={18} />
                    </button>
                    <button 
                      className="w-12 h-12 flex items-center justify-center text-white hover:bg-[rgba(246,231,188,0.14)] active:bg-[rgba(246,231,188,0.26)] transition-colors border-b border-[rgba(201,169,97,0.18)]" 
                      onClick={() => resetTransform()}
                    >
                      <Focus size={18} />
                    </button>
                    <button 
                      className="w-12 h-12 flex items-center justify-center text-white hover:bg-[rgba(246,231,188,0.14)] active:bg-[rgba(246,231,188,0.26)] transition-colors" 
                      onClick={() => zoomOut()}
                    >
                      <ZoomOut size={18} />
                    </button>
                  </div>
                </div>
                <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      ref={imgRef}
                      src={activePlan.image} 
                      alt={activePlan.name} 
                      onLoad={() => resetTransform()}
                      className="max-w-full max-h-[80vh] object-contain filter drop-shadow-2xl opacity-0 block"
                    />
                    
                    {/* Render Hotspots if they exist */}
                    {activePlan.hotspots?.map((hotspot) => (
                      <button
                        key={hotspot.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setHotspotImageIndex(0);
                          prevHotspotIndexRef.current = 0;
                          hotspotImageRefs.current = [];
                          setIsClosingHotspot(false);
                          setActiveHotspot(hotspot);
                        }}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-30"
                        style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                      >
                        <div className="relative flex items-center justify-center w-10 h-10 cursor-pointer">
                          {/* Pulsating Ring (Darker for contrast) */}
                          <div className="absolute inset-1 bg-[rgba(11,10,8,0.25)] border border-black/10 rounded-full animate-ping" />
                          
                          {/* Apple-style Dark Glass Marker */}
                          <div className="relative w-7 h-7 bg-[rgba(11,10,8,0.45)] backdrop-blur-xl rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(246,231,188,0.2)] border border-[rgba(201,169,97,0.28)] flex items-center justify-center text-white group-hover:scale-125 group-hover:bg-[rgba(11,10,8,0.60)] transition-all duration-300">
                            <MapPin size={14} className="text-white drop-shadow-md" />
                          </div>
                        </div>
                        
                        {/* Apple-style Dark Glass Label */}
                        <span className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold tracking-[0.2em] text-white bg-[rgba(11,10,8,0.60)] backdrop-blur-xl border border-[rgba(201,169,97,0.18)] shadow-[0_8px_16px_rgba(0,0,0,0.5)] px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 uppercase scale-95 group-hover:scale-100">
                          {hotspot.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>
      </div>

      {/* Hotspot Photo Gallery Modal */}
      {activeHotspot && (
        <div ref={modalContainerRef} className="absolute inset-0 z-[60] bg-[rgba(11,10,8,0.80)] backdrop-blur-xl flex items-center justify-center pointer-events-auto p-4 md:p-8 opacity-0">
          <div ref={modalContentRef} className="relative w-full max-w-5xl h-auto aspect-square md:aspect-video bg-[var(--ink-deep)] rounded-2xl border border-[rgba(201,169,97,0.28)] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] opacity-0">
            
            {/* Gallery Images (Mapped for Crossfade) */}
            {activeHotspot.images.map((imgSrc, idx) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                key={`${activeHotspot.id}-${idx}`}
                ref={(el) => { hotspotImageRefs.current[idx] = el; }}
                src={imgSrc}
                alt={`${activeHotspot.title} View ${idx + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  opacity: idx === hotspotImageIndex ? 1 : 0,
                  zIndex: idx === hotspotImageIndex ? 1 : 0
                }}
              />
            ))}

            {/* Gradient Scrims for text and button readability on bright images */}
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(6,6,5,0.92)] via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-[rgba(6,6,5,0.75)] via-transparent to-transparent pointer-events-none h-32" />
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(6,6,5,0.75)] via-transparent to-transparent pointer-events-none w-32" />
            <div className="absolute inset-0 bg-gradient-to-l from-[rgba(6,6,5,0.75)] via-transparent to-transparent pointer-events-none w-32 right-0 left-auto" />

            {/* Title */}
            <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 pointer-events-none">
              <h3 className="text-2xl md:text-3xl font-light text-white tracking-widest uppercase mb-1">{activeHotspot.title}</h3>
              <p className="text-white/60 text-xs tracking-widest uppercase">{hotspotImageIndex + 1} / {activeHotspot.images.length}</p>
            </div>

            {/* Close Button */}
            <button 
              onClick={handleCloseHotspot}
              className="absolute top-4 right-4 md:top-6 md:right-6 p-3 md:p-4 rounded-full bg-[rgba(11,10,8,0.80)] text-white hover:bg-[var(--gold-300)] hover:text-[#1A150B] backdrop-blur-xl border border-[rgba(201,169,97,0.28)] transition-colors z-20 shadow-2xl"
            >
              <X size={24} />
            </button>

            {/* Navigation Arrows (if multiple images) */}
            {activeHotspot.images.length > 1 && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); setHotspotImageIndex((prev) => (prev - 1 + activeHotspot.images.length) % activeHotspot.images.length); }}
                  className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 p-4 md:p-5 rounded-full bg-[rgba(11,10,8,0.80)] text-white hover:bg-[var(--gold-300)] hover:text-[#1A150B] backdrop-blur-xl border border-[rgba(201,169,97,0.28)] transition-all z-20 group shadow-2xl"
                >
                  <ChevronLeft size={32} className="group-hover:-translate-x-1 transition-transform drop-shadow-md" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setHotspotImageIndex((prev) => (prev + 1) % activeHotspot.images.length); }}
                  className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 p-4 md:p-5 rounded-full bg-[rgba(11,10,8,0.80)] text-white hover:bg-[var(--gold-300)] hover:text-[#1A150B] backdrop-blur-xl border border-[rgba(201,169,97,0.28)] transition-all z-20 group shadow-2xl"
                >
                  <ChevronRight size={32} className="group-hover:translate-x-1 transition-transform drop-shadow-md" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
