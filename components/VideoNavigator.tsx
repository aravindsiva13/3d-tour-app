"use client";

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ProjectConfig } from '@/lib/types';
import { GlobalNav, GlobalTab } from './GlobalNav';
import { GalleryOverlay } from './GalleryOverlay';
import { Preloader } from './Preloader';
import { FloorPlans } from './FloorPlans';
import { LocationMap } from './LocationMap';
import { ContactOverlay } from './ContactOverlay';
import { PanoramaViewer } from './PanoramaViewer';
import { VirtualSpaceGallery } from './VirtualSpaceGallery';
import { Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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

// Mode fallback hook
function useMode() {
  const [mode, setMode] = useState<'video' | 'stills'>('video');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setMode('stills');
      return;
    }

    const nav = navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } };
    if (nav.connection) {
      if (nav.connection.saveData) {
        setMode('stills');
        return;
      }
      const type = nav.connection.effectiveType;
      if (type === 'slow-2g' || type === '2g' || type === '3g') {
        setMode('stills');
        return;
      }
    }
  }, []);

  return mode;
}

export const VideoNavigator: React.FC<{ project: ProjectConfig }> = ({ project }) => {
  const mode = useMode();
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  const [activeTab, setActiveTab] = useState<GlobalTab>('home');
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [selectedPanoramaId, setSelectedPanoramaId] = useState<string | null>(null);
  
  // Dual video player state
  const [activePlayer, setActivePlayer] = useState<0 | 1>(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [initialPlayDone, setInitialPlayDone] = useState(false);
  const [showPreloader, setShowPreloader] = useState(true);
  
  const video0Ref = useRef<HTMLVideoElement | null>(null);
  const video1Ref = useRef<HTMLVideoElement | null>(null);
  
  const utilityNavRef = useRef<HTMLDivElement>(null);
  const globalNavRef = useRef<HTMLDivElement>(null);

  // Initialize first video
  useEffect(() => {
    if (mode === 'stills' || initialPlayDone) return;
    const v0 = video0Ref.current;
    if (v0 && project.videoSegments.length > 0) {
      v0.src = project.videoSegments[0].videoUrl;
      v0.load();
    }
  }, [mode, initialPlayDone, project.videoSegments]);

  const crossfadeToSegment = async (segmentIndex: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    const segment = project.videoSegments[segmentIndex];
    const nextPlayer = activePlayer === 0 ? 1 : 0;
    const vNext = nextPlayer === 0 ? video0Ref.current : video1Ref.current;
    const vCurrent = activePlayer === 0 ? video0Ref.current : video1Ref.current;

    if (!vNext || !vCurrent) {
      setIsTransitioning(false);
      return;
    }

    vNext.src = segment.videoUrl;
    
    // Wait for the next video to be ready to play
    await new Promise<void>((resolve) => {
      const handleCanPlay = () => {
        vNext.removeEventListener('canplay', handleCanPlay);
        resolve();
      };
      
      // If it's already ready (cached)
      if (vNext.readyState >= 3) {
        resolve();
      } else {
        vNext.addEventListener('canplay', handleCanPlay);
        vNext.load();
      }
    });

    try {
      await vNext.play();
    } catch (e) {
      console.warn("Autoplay prevented on crossfade", e);
    }

    // Instant cut (no effect)
    gsap.set(vNext, { opacity: 1 });
    gsap.set(vCurrent, { opacity: 0 });
    vCurrent.pause();
    setActivePlayer(nextPlayer);
    setCurrentVideoIndex(segmentIndex);
    setIsTransitioning(false);
  };

  const handleNextVideo = () => {
    if (isTransitioning || currentVideoIndex >= project.videoSegments.length - 1) return;
    crossfadeToSegment(currentVideoIndex + 1);
  };

  const handlePrevVideo = () => {
    if (isTransitioning || currentVideoIndex <= 0) return;
    crossfadeToSegment(currentVideoIndex - 1);
  };

  // Handle video playback state based on active tab
  useEffect(() => {
    const vCurrent = activePlayer === 0 ? video0Ref.current : video1Ref.current;
    if (!vCurrent) return;

    if (activeTab !== 'home' || showContact) {
      // Pause the background video to save GPU/CPU performance when overlays are open
      vCurrent.pause();
    } else {
      // Play and do not loop on the home tab
      vCurrent.loop = false;
      vCurrent.play().catch(e => console.warn(e));
    }
  }, [activeTab, showContact, activePlayer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showContact) setShowContact(false);
        else if (selectedPanoramaId) setSelectedPanoramaId(null);
        else if (activeTab !== 'home') setActiveTab('home');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showContact, activeTab]);

  return (
    <div className="navigator-container">
      {showPreloader && (
        <Preloader isReady={initialPlayDone} onComplete={() => setShowPreloader(false)} />
      )}

      {/* Still Layer */}
      <div 
        className="still-layer" 
        style={{ 
          opacity: initialPlayDone ? 0 : 1, 
          transition: 'opacity 1s', 
          pointerEvents: initialPlayDone ? 'none' : 'auto' 
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={project.homePoster} 
          alt="Home" 
          className="poster-img active"
          loading="lazy"
        />
      </div>

      {/* Video Layer (Dual Players for Crossfading) */}
      {mode === 'video' && (
        <div className="video-layer">
          <video
            ref={video0Ref}
            muted
            playsInline
            preload="auto"
            className="clip-video"
            style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onCanPlay={(e) => {
              if (!initialPlayDone && activePlayer === 0) {
                const v = e.target as HTMLVideoElement;
                v.play().then(() => {
                  gsap.set(v, { opacity: 1 });
                  setInitialPlayDone(true);
                }).catch(err => console.warn(err));
              }
            }}
          />
          <video
            ref={video1Ref}
            muted
            playsInline
            preload="auto"
            className="clip-video"
            style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onCanPlay={(e) => {
              if (!initialPlayDone && activePlayer === 1) {
                const v = e.target as HTMLVideoElement;
                v.play().then(() => {
                  gsap.set(v, { opacity: 1 });
                  setInitialPlayDone(true);
                }).catch(err => console.warn(err));
              }
            }}
          />
        </div>
      )}

      {/* Home Arrow Navigation */}
      {activeTab === 'home' && !showContact && !showPreloader && (
        <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-between px-4 md:px-12">
          <div className="pointer-events-auto">
            {currentVideoIndex > 0 && (
              <MagneticWrapper>
                <button 
                  onClick={handlePrevVideo}
                  disabled={isTransitioning}
                  className="flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-black/20 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] text-white hover:bg-white/20 transition-all group disabled:opacity-50"
                >
                  <ChevronLeft className="w-6 h-6 md:w-8 md:h-8 group-hover:-translate-x-1 transition-transform" />
                </button>
              </MagneticWrapper>
            )}
          </div>
          <div className="pointer-events-auto">
            {currentVideoIndex < project.videoSegments.length - 1 && (
              <MagneticWrapper>
                <button 
                  onClick={handleNextVideo}
                  disabled={isTransitioning}
                  className="flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-black/20 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)] text-white hover:bg-white/20 transition-all group disabled:opacity-50"
                >
                  <ChevronRight className="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-1 transition-transform" />
                </button>
              </MagneticWrapper>
            )}
          </div>
        </div>
      )}

      {/* Logo (Top Left) */}
      <div className={`absolute top-4 left-4 md:top-8 md:left-12 z-40 transition-opacity duration-1000 delay-500 ${(showContact || showPreloader) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src="/navarthana-logo.png" 
          alt="Navarthana" 
          className="h-16 md:h-24 w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
        />
      </div>

      {/* Utility Navigation (Top Right) */}
      <div ref={utilityNavRef} className={`absolute top-4 right-4 md:top-8 md:right-12 z-40 flex items-center gap-2 md:gap-4 transition-opacity duration-1000 delay-500 ${(showContact || showPreloader) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <MagneticWrapper className={showContact ? 'pointer-events-none' : 'pointer-events-auto'}>
          <button 
            onClick={() => setShowContact(true)}
            disabled={showContact}
            className="group relative flex items-center h-10 w-10 md:h-12 md:w-12 rounded-full backdrop-blur-2xl bg-white/10 border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:w-[105px] md:hover:w-[125px] hover:bg-white/20"
          >
            <div className="absolute left-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center shrink-0">
              <Phone size={16} className="text-white opacity-80 group-hover:opacity-100 transition-opacity md:w-[18px] md:h-[18px]" />
            </div>
            <span className="absolute left-8 md:left-10 text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase text-white opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap">Contact</span>
          </button>
        </MagneticWrapper>
      </div>

      {/* Overlays */}
      {activeTab === 'floor' && project.floorPlans && (
        <FloorPlans 
          plans={project.floorPlans} 
          onClose={() => setActiveTab('home')} 
        />
      )}
      
      {activeTab === 'map' && project.mapPins && (
        <LocationMap 
          pins={project.mapPins} 
          onClose={() => setActiveTab('home')} 
        />
      )}

      {activeTab === 'gallery' && project.gallery && (
        <GalleryOverlay 
          gallery={project.gallery}
          onClose={() => setActiveTab('home')} 
        />
      )}

      {activeTab === 'virtual' && project.virtualTour && (
        <>
          {!selectedPanoramaId ? (
            <VirtualSpaceGallery 
              nodes={project.virtualTour.nodes} 
              onSelect={setSelectedPanoramaId} 
              onClose={() => setActiveTab('home')} 
            />
          ) : (
            <PanoramaViewer
              config={{ ...project.virtualTour, defaultNode: selectedPanoramaId }}
              onClose={() => setSelectedPanoramaId(null)}
            />
          )}
        </>
      )}

      {showContact && (
        <ContactOverlay 
          onClose={() => setShowContact(false)} 
        />
      )}

      {/* Global Bottom Navigation */}
      <div ref={globalNavRef} className={`transition-opacity duration-1000 delay-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${(showContact || showPreloader) ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <GlobalNav 
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
        />
      </div>
    </div>
  );
};
