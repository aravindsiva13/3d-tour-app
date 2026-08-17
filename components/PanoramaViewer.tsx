"use client";

import React, { Suspense, useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture, useProgress } from '@react-three/drei';
import { VirtualTourConfig } from '@/lib/types';
import { Compass, Menu, X, ChevronRight, ChevronLeft } from 'lucide-react';
import gsap from 'gsap';

// Magnetic Button Wrapper
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

interface PanoramaViewerProps {
  config: VirtualTourConfig;
  onClose: () => void;
}

// 1. The "Enter the Room" Cinematic Animation Hook
const CinematicCamera = () => {
  const { camera } = useThree();
  const initialized = useRef(false);

  useEffect(() => {
    // Start zoomed out for the entry effect
    const pCam = camera as THREE.PerspectiveCamera;
    pCam.fov = 120;
    pCam.updateProjectionMatrix();
    initialized.current = true;
  }, [camera]);

  useFrame((state, delta) => {
    if (!initialized.current) return;
    const pCam = camera as THREE.PerspectiveCamera;
    
    // Smoothly interpolate FOV down to normal human vision (75)
    if (pCam.fov > 75.1) {
      pCam.fov = THREE.MathUtils.lerp(pCam.fov, 75, delta * 3);
      pCam.updateProjectionMatrix();
    }
  });

  return null;
};

// Custom hook to handle FOV-based zooming instead of physical camera movement
const ZoomController = () => {
  const { camera, gl } = useThree();
  
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const pCam = camera as THREE.PerspectiveCamera;
      pCam.fov += e.deltaY * 0.05;
      pCam.fov = Math.max(30, Math.min(100, pCam.fov));
      pCam.updateProjectionMatrix();
    };

    let initialPinchDistance = 0;
    let initialFov = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
        initialFov = (camera as THREE.PerspectiveCamera).fov;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = initialPinchDistance / dist;
        const pCam = camera as THREE.PerspectiveCamera;
        pCam.fov = initialFov * scale;
        pCam.fov = Math.max(30, Math.min(100, pCam.fov));
        pCam.updateProjectionMatrix();
      }
    };
    
    const domElement = gl.domElement;
    domElement.addEventListener('wheel', handleWheel, { passive: false });
    domElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    domElement.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      domElement.removeEventListener('wheel', handleWheel);
      domElement.removeEventListener('touchstart', handleTouchStart);
      domElement.removeEventListener('touchmove', handleTouchMove);
    };
  }, [camera, gl.domElement]);

  return null;
};

// 2. The 3D Panorama Sphere
const PanoramaSphere = ({ src }: { src: string }) => {
  const texture = useTexture(src);
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  );
};

export const PanoramaViewer: React.FC<PanoramaViewerProps> = ({ config, onClose }) => {
  // Track current room natively in this component so we don't have to unmount the viewer
  const [currentNodeId, setCurrentNodeId] = useState(config.defaultNode);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const topBarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, { opacity: 0, duration: 0.4, onComplete: onClose });
    } else {
      onClose();
    }
  };

  // Entrance Animation for Top Bar
  useEffect(() => {
    if (topBarRef.current) {
      gsap.fromTo(
        topBarRef.current.children,
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.5 }
      );
    }
  }, []);

  // Drawer Animation
  useEffect(() => {
    if (isDrawerOpen) {
      gsap.fromTo(
        '.drawer-item',
        { x: 30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power2.out', delay: 0.2 }
      );
    }
  }, [isDrawerOpen]);
  
  const currentNode = config.nodes[currentNodeId];

  if (!currentNode) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <p className="text-red-400 font-bold">Node not found.</p>
        <button onClick={onClose} className="ml-6 px-6 py-2 rounded-full bg-white/10 text-white">Close</button>
      </div>
    );
  }

  // Get all available rooms for the drawer
  const allRooms = Object.entries(config.nodes).map(([id, node]) => ({
    id,
    name: node.name
  }));
  
  const currentIndex = allRooms.findIndex(r => r.id === currentNodeId);
  
  const goToNext = () => {
    const nextIndex = (currentIndex + 1) % allRooms.length;
    setCurrentNodeId(allRooms[nextIndex].id);
  };

  const goToPrev = () => {
    const prevIndex = (currentIndex - 1 + allRooms.length) % allRooms.length;
    setCurrentNodeId(allRooms[prevIndex].id);
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black animate-in fade-in duration-500 font-sans overflow-hidden">
      
      {/* 3D Canvas */}
      <div className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none">
        <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }} gl={{ antialias: true, alpha: false }} dpr={[1, 2]}>
          <color attach="background" args={['#000000']} />
          <CinematicCamera />
          <ZoomController />
          
          <Suspense fallback={null}>
            {/* When currentNode.src changes, Suspense automatically triggers the loading spinner again */}
            <PanoramaSphere src={currentNode.src} />
          </Suspense>

          <OrbitControls 
            target={[0, 0, 0]}
            enableZoom={false} // Disable physical dollying (zooming out to infinity)
            enablePan={false} 
            enableDamping={true}
            dampingFactor={0.05}
            rotateSpeed={-0.4} 
          />
        </Canvas>
      </div>
      
      <LoadingOverlay />

      {/* Top UI */}
      <div ref={topBarRef} className="absolute top-0 left-0 right-0 p-6 md:p-8 flex justify-between items-start z-20 pointer-events-none bg-gradient-to-b from-black/60 to-transparent pb-32 transition-opacity duration-300" style={{ opacity: isDrawerOpen ? 0 : 1 }}>
        
        {/* Left Side: Current Location */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 bg-black/40 backdrop-blur-xl px-6 py-4 rounded-full border border-white/10 shadow-2xl pointer-events-auto">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/10 shrink-0">
              <Compass size={18} className="text-white" />
            </div>
            <div className="flex flex-col pr-4">
              <span className="text-[10px] text-white/50 tracking-[0.2em] uppercase font-bold mb-1">Current Location</span>
              <span className="text-white font-medium text-sm tracking-wide capitalize">{currentNode?.name}</span>
            </div>
          </div>
        </div>
        
        {/* Right Side: Controls */}
        <div className="flex items-center bg-black/40 backdrop-blur-xl rounded-full border border-white/10 p-1.5 pointer-events-auto shadow-2xl">
          {/* Change Room Button */}
          <MagneticWrapper>
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-3 px-6 py-3 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all text-xs font-semibold uppercase tracking-widest group"
            >
              <Menu size={18} className="opacity-80 group-hover:opacity-100 transition-opacity" />
              <span>Change Room</span>
            </button>
          </MagneticWrapper>

          <div className="w-[1px] h-5 bg-white/20 mx-1" />

          {/* Close Button */}
          <MagneticWrapper>
            <button 
              onClick={handleClose} 
              className="flex items-center gap-3 px-6 py-3 rounded-full text-white/80 hover:text-white hover:bg-red-500/80 transition-all text-xs font-semibold uppercase tracking-widest group"
            >
              <span>Close Tour</span>
              <X size={18} className="opacity-80 group-hover:opacity-100 transition-opacity" />
            </button>
          </MagneticWrapper>
        </div>

      </div>

       <div className="absolute bottom-10 md:bottom-16 left-0 right-0 flex flex-col items-center gap-4 pointer-events-none z-20 transition-opacity duration-300" style={{ opacity: isDrawerOpen ? 0 : 1 }}>
         <span className="bg-black/40 backdrop-blur-md px-6 py-2 rounded-full text-white/50 text-[10px] font-medium tracking-widest uppercase border border-white/10 shadow-xl">
           Drag to look around
         </span>
         
         {/* Next / Prev Controller */}
         <div className="flex items-center gap-2 pointer-events-auto bg-black/40 backdrop-blur-xl p-1.5 rounded-full border border-white/10 shadow-2xl">
           <MagneticWrapper>
             <button onClick={goToPrev} className="p-3 rounded-full hover:bg-white/10 text-white transition-colors border border-transparent hover:border-white/10">
               <ChevronLeft size={18} />
             </button>
           </MagneticWrapper>
           
           <span className="px-6 text-[10px] font-bold tracking-[0.2em] text-white/80 uppercase">
             {currentIndex + 1} / {allRooms.length}
           </span>
           
           <MagneticWrapper>
             <button onClick={goToNext} className="p-3 rounded-full hover:bg-white/10 text-white transition-colors border border-transparent hover:border-white/10">
               <ChevronRight size={18} />
             </button>
           </MagneticWrapper>
         </div>
      </div>

      {/* Option C: Glassy Side-Drawer */}
      <div 
        className={`absolute top-0 right-0 bottom-0 w-full md:w-96 bg-black/40 backdrop-blur-3xl border-l border-white/10 z-40 transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-6 md:p-10 flex justify-between items-center border-b border-white/10">
          <h2 className="text-white font-bold tracking-widest uppercase text-sm">Select Room</h2>
          <button 
            onClick={() => setIsDrawerOpen(false)}
            className="p-3 rounded-full bg-white/5 text-white hover:bg-white/20 transition-colors border border-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col gap-3">
          {allRooms.map((room) => (
            <button
              key={room.id}
              onClick={() => {
                setCurrentNodeId(room.id);
                setIsDrawerOpen(false);
              }}
              className={`drawer-item flex items-center justify-between p-5 rounded-2xl border transition-all hover:translate-x-2 ${
                currentNodeId === room.id 
                  ? 'bg-white/20 border-white/40 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                  : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white'
              }`}
            >
              <span className="font-medium tracking-wide">{room.name}</span>
              {currentNodeId === room.id ? (
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              ) : (
                <ChevronRight size={16} className="text-white/30" />
              )}
            </button>
          ))}
        </div>
      </div>
      
    </div>
  );
};

// 3. Loading State Overlay
const LoadingOverlay = () => {
  const { active, progress } = useProgress();
  
  if (!active) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md z-30 pointer-events-none transition-opacity duration-500">
      <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6 shadow-[0_0_30px_rgba(255,255,255,0.5)]"></div>
      <span className="text-white tracking-[0.3em] text-xs font-bold uppercase animate-pulse mb-2">Loading Environment...</span>
      <span className="text-white/50 text-[10px] tracking-widest">{Math.round(progress)}%</span>
    </div>
  );
};
