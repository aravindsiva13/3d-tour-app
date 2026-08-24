"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { loadPanorama, pinResident, preloadIdle, disposeAllPanoramas } from '@/lib/panoramaTextures';
import { VirtualTourConfig, VirtualTourLink } from '@/lib/types';
import { SceneHotspot } from './SceneHotspot';
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

/**
 * Minimal icon-only control. The written label is not dropped, just moved into a
 * tooltip that GSAP reveals on hover/focus — so the button stays discoverable
 * and screen readers still get a name.
 */
const IconAction: React.FC<{
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}> = ({ label, icon, onClick, danger = false }) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const glyphRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);

  const enter = () => {
    gsap.to(glyphRef.current, {
      scale: 1.14,
      rotate: danger ? 90 : 0,
      duration: 0.45,
      ease: 'back.out(2.2)'
    });
    gsap.to(tipRef.current, { y: 0, opacity: 1, duration: 0.32, ease: 'power3.out' });
    gsap.fromTo(
      ringRef.current,
      { scale: 0.75, opacity: 0.55 },
      { scale: 1.35, opacity: 0, duration: 0.7, ease: 'power2.out' }
    );
  };

  const leave = () => {
    gsap.to(glyphRef.current, { scale: 1, rotate: 0, duration: 0.4, ease: 'power3.out' });
    gsap.to(tipRef.current, { y: -4, opacity: 0, duration: 0.22, ease: 'power2.in' });
  };

  const press = () => gsap.to(btnRef.current, {
    scale: 0.9,
    duration: 0.1,
    yoyo: true,
    repeat: 1,
    ease: 'power2.inOut'
  });

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => { press(); onClick(); }}
        onMouseEnter={enter}
        onMouseLeave={leave}
        onFocus={enter}
        onBlur={leave}
        aria-label={label}
        title={label}
        className={`relative grid place-items-center w-11 h-11 rounded-full transition-colors duration-300 ${
          danger
            ? 'text-white/75 hover:text-white hover:bg-[rgba(190,60,50,0.55)]'
            : 'text-white/75 hover:text-[var(--gold-100)] hover:bg-[rgba(201,169,97,0.16)]'
        }`}
      >
        {/* Ripple that pulses outward on hover */}
        <span
          ref={ringRef}
          aria-hidden
          className={`absolute inset-0 rounded-full pointer-events-none opacity-0 border ${
            danger ? 'border-[rgba(255,140,130,0.55)]' : 'border-[var(--gold-300)]'
          }`}
        />
        <span ref={glyphRef} className="relative grid place-items-center will-change-transform">
          {icon}
        </span>
      </button>

      {/* Label on demand */}
      <span
        ref={tipRef}
        role="tooltip"
        className="pointer-events-none absolute top-full right-0 mt-2 whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-0 bg-[rgba(11,10,8,0.85)] backdrop-blur-md border border-[rgba(201,169,97,0.28)] text-[var(--gold-200)] shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        style={{ transform: 'translateY(-4px)' }}
      >
        {label}
      </span>
    </div>
  );
};

// 1. The "Enter the Room" Cinematic Animation Hook
const CinematicCamera = () => {
  const { camera } = useThree();
  const initialized = useRef(false);
  const settled = useRef(false);

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
    
    // Smoothly interpolate FOV down to normal human vision (75).
    // Runs for the entry effect only, then stands down for good — otherwise it
    // fights the transition tweens and the user's own pinch/wheel zoom.
    if (settled.current) return;
    if (pCam.fov > 75.1) {
      pCam.fov = THREE.MathUtils.lerp(pCam.fov, 75, delta * 3);
      pCam.updateProjectionMatrix();
    } else {
      settled.current = true;
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


// Convert yaw/pitch (in degrees) to 3D Cartesian coordinates
const getHotspotPosition = (yaw: number, pitch: number, radius = 450): [number, number, number] => {
  const phi = THREE.MathUtils.degToRad(90 - pitch);
  const theta = THREE.MathUtils.degToRad(yaw);
  
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return [x, y, z];
};

const TourHotspots = React.memo(function TourHotspots({ links, onNavigate }: { links: VirtualTourLink[], onNavigate: (link: VirtualTourLink) => void }) {
  return (
    <>
      {links.map((link, idx) => (
        <Html
          key={idx}
          position={getHotspotPosition(link.yaw, link.pitch)}
          center
          zIndexRange={[100, 0]}
        >
          <SceneHotspot label={link.label} onClick={() => onNavigate(link)} />
        </Html>
      ))}
    </>
  );
});


// --- Street View style transition -------------------------------------------
// Google Street View does three things at once when you click an arrow:
//   1. it TURNS to face the direction of travel,
//   2. it narrows the FOV so the destination rushes toward you (the "dolly"),
//   3. it CROSSFADES into the next panorama, then springs the FOV back out.
// The destination texture is preloaded, so nothing ever cuts to black.

const NORMAL_FOV = 75;
const ZOOMED_FOV = 34;

// Texture loading, residency and disposal all live in lib/panoramaTextures.

// The destination panorama, drawn *over* the current one and faded in.
// Sits on a slightly smaller sphere with depth testing off so it always wins.
const TransitionFadeOverlay = ({ materialRef }: {
  materialRef: React.RefObject<THREE.MeshBasicMaterial | null>
}) => (
  <mesh scale={[-1, 1, 1]} renderOrder={2}>
    <sphereGeometry args={[480, 60, 40]} />
    <meshBasicMaterial
      ref={materialRef}
      color="#000000"
      side={THREE.DoubleSide}
      transparent
      opacity={0}
      depthTest={false}
      depthWrite={false}
      toneMapped={false}
    />
  </mesh>
);

interface PendingMove {
  link: VirtualTourLink | null;   // null => menu/arrow jump, so no direction to turn toward
  texture: THREE.Texture;
  nodeId: string;
  entryYaw?: number;              // heading to face on arrival, if the node defines one
}

const TransitionController = ({ pending, onCommit, materialRef }: {
  pending: PendingMove | null,
  onCommit: (nodeId: string) => void,
  materialRef: React.RefObject<THREE.MeshBasicMaterial | null>
}) => {
  const { camera, controls } = useThree();
  const busy = useRef(false);
  const arrivalRef = useRef<gsap.core.Tween | null>(null);

  // Unmount-only: closing the viewer mid-flight must not leave a tween running
  // or the controls stranded in their disabled state.
  useEffect(() => () => {
    arrivalRef.current?.kill();
    const oc = controls as unknown as { enabled: boolean } | null;
    if (oc) oc.enabled = true;
    busy.current = false;
  }, [controls]);

  useEffect(() => {
    if (!pending || busy.current) return;

    busy.current = true;
    const pCam = camera as THREE.PerspectiveCamera;
    const oc = controls as unknown as {
      enabled: boolean;
      enableDamping: boolean;
      getAzimuthalAngle: () => number;
      getPolarAngle: () => number;
      setAzimuthalAngle: (v: number) => void;
      setPolarAngle: (v: number) => void;
      update: () => void;
    } | null;

    // OrbitControls applies `sphericalDelta * dampingFactor` per update, so with
    // damping on, setAzimuthalAngle() only closes 5% of the gap per call and the
    // turn undershoots badly. Drive it undamped, restore damping on arrival.
    // (setAzimuthalAngle/setPolarAngle call update() internally — don't double up.)
    const hadDamping = oc ? oc.enableDamping : false;
    if (oc) {
      oc.enabled = false;         // user drag would fight the turn
      oc.enableDamping = false;
    }

    const startFov = pCam.fov;
    const state = { az: 0, pol: 0, fov: startFov, blend: 0 };
    let turns = false;
    let turnTween: gsap.core.Tween | null = null;

    if (oc && pending.link) {
      // Camera orbits the origin, so to LOOK along d it must sit at -d.
      const [hx, hy, hz] = getHotspotPosition(pending.link.yaw, pending.link.pitch, 1);
      const sph = new THREE.Spherical().setFromVector3(new THREE.Vector3(-hx, -hy, -hz));

      state.az = oc.getAzimuthalAngle();
      state.pol = oc.getPolarAngle();

      // Shortest way round — never spin the long way for a 10 degree turn.
      const delta = Math.atan2(Math.sin(sph.theta - state.az), Math.cos(sph.theta - state.az));

      // Yaw goes all the way; pitch only leans 40% of the way, because the
      // hotspot sits on the floor and staring straight at the carpet looks wrong.
      const targetPol = THREE.MathUtils.clamp(
        state.pol + (sph.phi - state.pol) * 0.4,
        0.45,
        Math.PI - 0.45
      );

      turns = true;
      turnTween = gsap.to(state, {
        az: state.az + delta,
        pol: targetPol,
        duration: 0.55,
        ease: 'power2.inOut'
      });
    }

    const tl = gsap.timeline({
      onUpdate: () => {
        if (turns && oc) {
          oc.setAzimuthalAngle(state.az);
          oc.setPolarAngle(state.pol);
        }
        pCam.fov = state.fov;
        pCam.updateProjectionMatrix();
        if (materialRef.current) materialRef.current.opacity = state.blend;
      },
      onComplete: () => {
        // Overlay is fully opaque here, so swapping the base texture underneath
        // it is invisible — no flash, no black frame.
        onCommit(pending.nodeId);

        // Snap to the destination's arrival heading. This happens on the frame
        // the overlay is fully opaque, so the rotation is never seen — you just
        // open your eyes facing into the new room instead of at whatever wall
        // happened to line up with the previous room's yaw.
        if (oc && pending.entryYaw !== undefined) {
          const [ex, ey, ez] = getHotspotPosition(pending.entryYaw, 0, 1);
          const entry = new THREE.Spherical().setFromVector3(new THREE.Vector3(-ex, -ey, -ez));
          oc.setAzimuthalAngle(entry.theta);
          oc.setPolarAngle(entry.phi);
        }

        state.blend = 0;
        if (materialRef.current) materialRef.current.opacity = 0;

        // Arrival: FOV springs back out, which reads as "you stepped forward".
        arrivalRef.current = gsap.to(state, {
          fov: NORMAL_FOV,
          duration: 0.75,
          ease: 'power3.out',
          onUpdate: () => {
            pCam.fov = state.fov;
            pCam.updateProjectionMatrix();
          },
          onComplete: () => {
            if (oc) {
              oc.enabled = true;
              oc.enableDamping = hadDamping;
            }
            busy.current = false;
          }
        });
      }
    });

    tl.to(state, { fov: ZOOMED_FOV, duration: 0.9, ease: 'power2.in' }, 0)
      .to(state, { blend: 1, duration: 0.5, ease: 'none' }, 0.4);

    // Only the zoom-in timeline is torn down here. The arrival tween must NOT be:
    // committing sets `pending` to null, which re-runs this effect's cleanup the
    // very frame the arrival tween starts — killing it would strand the FOV at 34.
    // It is cleaned up on unmount instead (see below).
    return () => { tl.kill(); turnTween?.kill(); };
  }, [pending, camera, controls, onCommit, materialRef]);

  return null;
};

// 2. The 3D Panorama Sphere
const PanoramaSphere = React.memo(function PanoramaSphere({ texture, editMode, editTarget, allRooms }: { texture: THREE.Texture, editMode: boolean, editTarget: string, allRooms: { id: string; name: string }[] }) {
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!editMode) return;
    
    // Calculate intersection point relative to the center
    const point = e.point;
    
    // Calculate spherical coordinates from cartesian
    const radius = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
    const phi = Math.acos(point.y / radius);
    const theta = Math.atan2(point.z, point.x);

    const pitch = 90 - THREE.MathUtils.radToDeg(phi);
    const yaw = THREE.MathUtils.radToDeg(theta);

    const logMsg = {
      yaw: parseFloat(yaw.toFixed(2)),
      pitch: parseFloat(pitch.toFixed(2))
    };
    
    const targetName = allRooms.find(r => r.id === editTarget)?.name || "Go to...";
    const snippet = `{ "nodeId": "${editTarget || "TARGET"}", "label": "${targetName}", "yaw": ${logMsg.yaw}, "pitch": ${logMsg.pitch} }`;
    
    navigator.clipboard.writeText(snippet).then(() => {
      console.log(`%c[Hotspot Edit Mode] Copied to clipboard!`, 'color: #00ff00; font-weight: bold; font-size: 14px', snippet);
    }).catch(() => {
      console.log(`%c[Hotspot Edit Mode]`, 'color: #00ff00; font-weight: bold; font-size: 14px', logMsg);
    });
  };

  return (
    <mesh scale={[-1, 1, 1]} onDoubleClick={handleClick}>
      <sphereGeometry args={[500, 60, 40]} />
      {/* BackSide only: we are inside the sphere, so the front faces are pure waste */}
      <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
});

export const PanoramaViewer: React.FC<PanoramaViewerProps> = ({ config, onClose }) => {
  // Track current room natively in this component so we don't have to unmount the viewer
    const [currentNodeId, setCurrentNodeId] = useState(config.defaultNode);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const incomingMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
  const [editTarget, setEditTarget] = useState("");

  // Toggle Edit Mode (Ctrl+E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setEditMode(prev => {
          const next = !prev;
          console.log(`%c[Hotspot Edit Mode] ${next ? 'ENABLED' : 'DISABLED'}`, `color: ${next ? '#00ff00' : '#ff0000'}; font-weight: bold; font-size: 14px`);
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
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

  // --- Texture residency ---------------------------------------------------
  // Only the panorama on screen is loaded up front. Neighbours are warmed one
  // at a time during idle, and everything outside the resident set is disposed.
  const [currentTexture, setCurrentTexture] = useState<THREE.Texture | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const node = config.nodes[currentNodeId];
    if (!node) return;
    let stale = false;

    setLoadError(false);
    loadPanorama(node.src)
      .then(tex => { if (!stale) setCurrentTexture(tex); })
      .catch(() => { if (!stale) setLoadError(true); });

    return () => { stale = true; };
  }, [currentNodeId, config.nodes]);

  // Keep the current room (and the one being moved to) pinned; evict the rest.
  useEffect(() => {
    const node = config.nodes[currentNodeId];
    const target = pending ? config.nodes[pending.nodeId] : undefined;
    pinResident([node?.src, target?.src]);
  }, [currentNodeId, pending, config.nodes]);

  // Warm connected rooms only, sequentially, on idle — never all 16 at once.
  useEffect(() => {
    const node = config.nodes[currentNodeId];
    if (!node) return;
    const neighbours = (node.links || [])
      .map(l => config.nodes[l.nodeId]?.src)
      .filter((s): s is string => Boolean(s));
    return preloadIdle(neighbours);
  }, [currentNodeId, config.nodes]);

  // Viewer closed: hand every panorama back to the GPU.
  useEffect(() => () => { disposeAllPanoramas(); }, []);

  const handleCommit = useCallback((nodeId: string) => {
    setCurrentNodeId(nodeId);
    setPending(null);
  }, []);

  // Every route into a new room goes through here so they all get the same
  // transition. `link` is null for menu / next / prev jumps: nothing to turn toward.
  const navigateTo = useCallback((nodeId: string, link: VirtualTourLink | null) => {
    const target = config.nodes[nodeId];
    if (!target || pending) return;
    // Resolve the destination before starting the move, so the commit at the end
    // of the zoom is a swap between two decoded textures — never a stall.
    loadPanorama(target.src)
      .then(texture => setPending({ link, texture, nodeId, entryYaw: target.entryYaw }))
      .catch(() => setCurrentNodeId(nodeId)); // texture failed: jump rather than hang
  }, [config.nodes, pending]);

  const handleHotspotNavigate = useCallback((link: VirtualTourLink) => {
    navigateTo(link.nodeId, link);
  }, [navigateTo]);

  // Stable identity: rebuilding this each render defeated the memo on the sphere.
  const allRooms = useMemo(
    () => Object.entries(config.nodes).map(([id, node]) => ({ id, name: node.name })),
    [config.nodes]
  );

  const currentNode = config.nodes[currentNodeId];

  if (!currentNode) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--ink-deep)] flex items-center justify-center">
        <p className="text-red-400 font-bold">Node not found.</p>
        <button onClick={onClose} className="ml-6 px-6 py-2 rounded-full bg-[rgba(246,231,188,0.08)] text-white">Close</button>
      </div>
    );
  }

  const currentIndex = allRooms.findIndex(r => r.id === currentNodeId);
  
  const goToNext = () => {
    const nextIndex = (currentIndex + 1) % allRooms.length;
    navigateTo(allRooms[nextIndex].id, null);
  };

  const goToPrev = () => {
    const prevIndex = (currentIndex - 1 + allRooms.length) % allRooms.length;
    navigateTo(allRooms[prevIndex].id, null);
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-[var(--ink-deep)] animate-in fade-in duration-500 font-sans overflow-hidden">
      
      {/* 3D Canvas */}
      <div className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none">
        <Canvas
          camera={{ position: [0, 0, 0.1], fov: 75 }}
          /* A textured sphere has no geometry edges to alias, so MSAA buys
             nothing here and costs real fill rate at 4K. */
          gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
          /* Cap at 2x: past that we are shading pixels the panorama has no
             detail for, which is the main source of dropped frames on phones. */
          dpr={[1, 2]}
        >
          <color attach="background" args={['#000000']} />
          <CinematicCamera />
          <TransitionController
            pending={pending}
            onCommit={handleCommit}
            materialRef={incomingMatRef}
          />
          <ZoomController />

          {/* No Suspense: the texture is resolved before it reaches the sphere,
              so the sphere can never unmount mid-tour and flash black. */}
          {currentTexture && (
            <PanoramaSphere texture={currentTexture} editMode={editMode} editTarget={editTarget} allRooms={allRooms} />
          )}
          {/* Hotspots hide during a move so you cannot fire a second one mid-flight */}
          {!pending && currentTexture && (
            <TourHotspots links={currentNode.links || []} onNavigate={handleHotspotNavigate} />
          )}

          {/* Dip to black transition overlay */}
          {pending && <TransitionFadeOverlay materialRef={incomingMatRef} />}

          <OrbitControls
            makeDefault
            target={[0, 0, 0]}
            enableZoom={false} // Disable physical dollying (zooming out to infinity)
            enablePan={false} 
            enableDamping={true}
            dampingFactor={0.05}
            rotateSpeed={-0.4} 
          />
        </Canvas>
      </div>
      
      <LoadingOverlay visible={!currentTexture} failed={loadError} />

      {editMode && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-red-500/80 backdrop-blur-md px-6 py-2 rounded-full border border-red-400 text-white text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(255,0,0,0.5)] animate-pulse">
          Edit Mode Active: Click anywhere to log yaw/pitch
        </div>
      )}

      {/* Top UI */}
      <div ref={topBarRef} className="absolute top-0 left-0 right-0 p-6 md:p-8 flex justify-between items-start z-20 pointer-events-none bg-gradient-to-b from-[rgba(6,6,5,0.75)] to-transparent pb-32 transition-opacity duration-300" style={{ opacity: isDrawerOpen ? 0 : 1 }}>
        
        {/* Left Side: Current Location */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 bg-[rgba(11,10,8,0.45)] backdrop-blur-xl px-6 py-4 rounded-full border border-[rgba(201,169,97,0.18)] shadow-2xl pointer-events-auto">
            <div className="w-10 h-10 bg-[rgba(246,231,188,0.08)] rounded-full flex items-center justify-center border border-[rgba(201,169,97,0.18)] shrink-0">
              <Compass size={18} className="text-white" />
            </div>
            <div className="flex flex-col pr-4">
              <span className="text-[10px] text-white/50 tracking-[0.2em] uppercase font-bold mb-1">Current Location</span>
              <span className="text-white font-medium text-sm tracking-wide capitalize">{currentNode?.name}</span>
            </div>
          </div>
        </div>
        
        {/* Right Side: Controls — icon only. Labels live in the tooltip so the
            affordance survives without the chrome. */}
        <div className="flex items-center gap-1 bg-[rgba(11,10,8,0.45)] backdrop-blur-xl rounded-full border border-[rgba(201,169,97,0.18)] p-1.5 pointer-events-auto shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(246,231,188,0.14)]">
          <IconAction
            label="Change Room"
            onClick={() => setIsDrawerOpen(true)}
            icon={<Menu size={18} />}
          />

          <span aria-hidden className="w-px h-5 bg-[linear-gradient(to_bottom,transparent,rgba(201,169,97,0.45),transparent)]" />

          <IconAction
            label="Close Tour"
            onClick={handleClose}
            icon={<X size={18} />}
            danger
          />
        </div>

      </div>

       <div className="absolute bottom-10 md:bottom-16 left-0 right-0 flex flex-col items-center gap-4 pointer-events-none z-20 transition-opacity duration-300" style={{ opacity: isDrawerOpen ? 0 : 1 }}>
         <span className="bg-[rgba(11,10,8,0.45)] backdrop-blur-md px-6 py-2 rounded-full text-white/50 text-[10px] font-medium tracking-widest uppercase border border-[rgba(201,169,97,0.18)] shadow-xl">
           Drag to look around
         </span>
         
         {/* Next / Prev Controller */}
         <div className="flex items-center gap-2 pointer-events-auto bg-[rgba(11,10,8,0.45)] backdrop-blur-xl p-1.5 rounded-full border border-[rgba(201,169,97,0.18)] shadow-2xl">
           <MagneticWrapper>
             <button onClick={goToPrev} className="p-3 rounded-full hover:bg-[rgba(246,231,188,0.08)] text-white transition-colors border border-transparent hover:border-[rgba(201,169,97,0.18)]">
               <ChevronLeft size={18} />
             </button>
           </MagneticWrapper>
           
           <span className="px-6 text-[10px] font-bold tracking-[0.2em] text-white/80 uppercase">
             {currentIndex + 1} / {allRooms.length}
           </span>
           
           <MagneticWrapper>
             <button onClick={goToNext} className="p-3 rounded-full hover:bg-[rgba(246,231,188,0.08)] text-white transition-colors border border-transparent hover:border-[rgba(201,169,97,0.18)]">
               <ChevronRight size={18} />
             </button>
           </MagneticWrapper>
         </div>
      </div>

      {/* Option C: Glassy Side-Drawer */}
      <div 
        className={`absolute top-0 right-0 bottom-0 w-full md:w-96 bg-[rgba(11,10,8,0.45)] backdrop-blur-3xl border-l border-[rgba(201,169,97,0.18)] z-40 transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-6 md:p-10 flex justify-between items-center border-b border-[rgba(201,169,97,0.18)]">
          <h2 className="text-white font-bold tracking-widest uppercase text-sm">Select Room</h2>
          <button 
            onClick={() => setIsDrawerOpen(false)}
            className="p-3 rounded-full bg-[rgba(246,231,188,0.05)] text-white hover:bg-[rgba(246,231,188,0.14)] transition-colors border border-[rgba(201,169,97,0.18)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col gap-3">
          {allRooms.map((room) => (
            <button
              key={room.id}
              onClick={() => {
                navigateTo(room.id, null);
                setIsDrawerOpen(false);
              }}
              className={`drawer-item flex items-center justify-between p-5 rounded-2xl border transition-all hover:translate-x-2 ${
                currentNodeId === room.id 
                  ? 'bg-[rgba(201,169,97,0.18)] border-[var(--gold-400)] text-[var(--gold-100)] shadow-[0_0_22px_rgba(201,169,97,0.30)]' 
                  : 'bg-[rgba(246,231,188,0.05)] border-[rgba(201,169,97,0.10)] text-white/70 hover:bg-[rgba(246,231,188,0.08)] hover:border-[rgba(201,169,97,0.28)] hover:text-white'
              }`}
            >
              <span className="font-medium tracking-wide">{room.name}</span>
              {currentNodeId === room.id ? (
                <div className="w-2 h-2 rounded-full bg-[var(--gold-300)] animate-pulse" />
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
const LoadingOverlay = ({ visible, failed }: { visible: boolean; failed: boolean }) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(11,10,8,0.90)] backdrop-blur-md z-30 pointer-events-none transition-opacity duration-500">
      <div className="w-16 h-16 border-4 border-[rgba(201,169,97,0.28)] border-t-white rounded-full animate-spin mb-6 shadow-[0_0_30px_rgba(246,231,188,0.5)]"></div>
      <span className="text-white tracking-[0.3em] text-xs font-bold uppercase animate-pulse mb-2">
        {failed ? 'Environment Unavailable' : 'Loading Environment...'}
      </span>
    </div>
  );
};
