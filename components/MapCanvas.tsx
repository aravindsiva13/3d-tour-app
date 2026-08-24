"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
// Must be imported before react-map-gl constructs a Map — see the file header.
import '@/lib/maplibreCompat';
import Map, { Marker, Popup, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin as MapPinType } from '@/lib/types';
import { Layers } from 'lucide-react';
import gsap from 'gsap';

interface MapCanvasProps {
  pins: MapPinType[];
  hoveredPinId?: string | null;
}

/* ---------------------------------------------------------------------------
 * Map styles live at module scope.
 *
 * This matters more than it looks: react-map-gl compares `mapStyle` by
 * REFERENCE. Building the satellite style object inside render handed it a new
 * object on every single render, so every hover over the legend triggered a
 * full map.setStyle() — tearing down and refetching all tiles and layers.
 * Hoisting makes the identity stable and the style is applied exactly once.
 * ------------------------------------------------------------------------- */
const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    'esri-satellite': {
      type: 'raster' as const,
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: 'Esri, Maxar, Earthstar Geographics, USDA FSA, USGS, Aerogrid, IGN, IGP, and the GIS User Community'
    }
  },
  layers: [
    {
      id: 'satellite-layer',
      type: 'raster' as const,
      source: 'esri-satellite',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const AnimatedPin: React.FC<{ children: React.ReactNode, delay: number }> = ({ children, delay }) => {
  const pinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = pinRef.current;
    if (!el) return;
    const tween = gsap.fromTo(el,
      { opacity: 0, y: -50, scale: 0.5 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "bounce.out", delay, force3D: true }
    );
    // Kill on unmount so a closed map never leaves tweens on the GSAP ticker.
    return () => { tween.kill(); };
  }, [delay]);

  return <div ref={pinRef}>{children}</div>;
};

const PopupContent = ({ pin }: { pin: MapPinType }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(contentRef.current,
        { opacity: 0, scale: 0.8, y: 10 },
        { opacity: 1, scale: 1, y: -10, duration: 0.7, ease: "elastic.out(1, 0.5)", force3D: true }
      );
    }
  }, []);

  /* The project-site pin shows the building render on its own — no card, no
     border, no backing. The PNG is a transparent cut-out and the maplibre popup
     shell is already transparent (see .maplibregl-popup-content in globals.css),
     so the building sits directly on the map exactly like the source artwork.
     Same anchor, same position, same interaction as before. */
  if (pin.isMain) {
    return (
      <div ref={contentRef} className="pointer-events-auto w-[132px] sm:w-[160px] md:w-[184px] max-w-[45vw]">
        {/* Native 1491x1055 ratio is preserved, so the building is never stretched. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/dcc-building-marker.webp"
          alt="DCC project site — building exterior"
          width={320}
  height={226}
          loading="lazy"
          decoding="async"
          draggable={false}
           className="block w-[140px] h-auto object-contain select-none"
        />
      </div>
    );
  }

  return (
    <div ref={contentRef} className="bg-[rgba(11,10,8,0.80)] backdrop-blur-2xl border border-[rgba(201,169,97,0.28)] shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(246,231,188,0.2)] rounded-2xl p-5 flex flex-col gap-1 min-w-[220px] pointer-events-auto">
      <strong className="text-sm font-bold uppercase tracking-widest text-white leading-tight">{pin.label}</strong>
      {pin.driveTime && <span className="text-xs text-white/70 font-medium mt-1">{pin.driveTime}</span>}
    </div>
  );
};

/* Marker content is memoised: without this every legend hover re-rendered all
 * 22 pins. Only the hovered pin's props actually change. */
const PinMarker = React.memo(function PinMarker({
  pin, index, isHovered, onSelect
}: {
  pin: MapPinType;
  index: number;
  isHovered: boolean;
  onSelect: (pin: MapPinType) => void;
}) {
  return (
    <Marker
      longitude={pin.lng}
      latitude={pin.lat}
      anchor="center"
      onClick={e => {
        e.originalEvent.stopPropagation();
        onSelect(pin);
      }}
    >
      <AnimatedPin delay={index * 0.1}>
        {pin.isMain ? (
          <div className={`relative flex items-center justify-center w-16 h-16 cursor-pointer group z-50 transition-transform duration-500 ${isHovered ? 'scale-125' : 'scale-100'}`}>
            {/* Pulsating ring (Main Pin) */}
            <div className="absolute inset-0 bg-[var(--gold-500)] rounded-full opacity-30 animate-ping"></div>
            <div className="absolute inset-2 bg-[var(--gold-500)] rounded-full opacity-40 animate-pulse"></div>
            {/* Core dot (Main Pin) */}
            <div className="relative w-7 h-7 bg-[var(--gold-500)] text-black font-bold text-[11px] rounded-full shadow-[0_0_22px_rgba(201,169,97,0.95)] border border-[rgba(201,169,97,0.60)] group-hover:scale-125 transition-transform duration-300 flex items-center justify-center">
              {index + 1}
            </div>
          </div>
        ) : (
          <div className={`relative flex items-center justify-center w-12 h-12 cursor-pointer group transition-transform duration-500 z-40 ${isHovered ? 'scale-125 z-50' : 'scale-100'}`}>
            {/* Pulsating ring (Regular Pin) */}
            <div className="absolute inset-2 bg-[var(--gold-300)] rounded-full opacity-20 animate-ping"></div>
            {/* Core dot (Regular Pin) */}
            <div className={`relative w-6 h-6 rounded-full border shadow-lg flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${isHovered ? 'bg-[var(--gold-300)] text-[#1A150B] border-[var(--gold-100)]' : 'bg-[rgba(11,10,8,0.60)] backdrop-blur-md text-white border-[rgba(201,169,97,0.60)] group-hover:bg-[var(--gold-300)] group-hover:text-[#1A150B] group-hover:border-[var(--gold-100)]'}`}>
              {index + 1}
            </div>
          </div>
        )}
      </AnimatedPin>
    </Marker>
  );
});

export default function MapCanvas({ pins, hoveredPinId }: MapCanvasProps) {
  const [popupInfo, setPopupInfo] = useState<MapPinType | null>(null);
  const [mapMode, setMapMode] = useState<'light' | 'dark' | 'satellite'>('light');
  const mapRef = useRef<MapRef>(null);

  // Keep the latest pins in a ref so the flyTo effect does not re-run (and
  // re-fly) just because the parent handed us a new array identity.
  const pinsRef = useRef(pins);
  pinsRef.current = pins;

  useEffect(() => {
    if (!hoveredPinId) return;
    const pin = pinsRef.current.find(p => p.id === hoveredPinId);
    const map = mapRef.current?.getMap();
    if (!pin || !map) return;

    map.flyTo({ center: [pin.lng, pin.lat], zoom: 15, duration: 1200, essential: true });

    // Cancel an in-flight camera animation if the pointer moves on quickly —
    // otherwise queued flyTos fight each other and the camera stutters.
    return () => { map.stop(); };
  }, [hoveredPinId]);

  // Release GPU/network resources held by the style when the panel closes.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    return () => { map?.stop(); };
  }, []);

  const handleMapClick = useCallback(() => setPopupInfo(null), []);
  const handleSelectPin = useCallback((pin: MapPinType) => setPopupInfo(pin), []);

  const currentStyle = mapMode === 'dark' ? DARK_STYLE
    : mapMode === 'light' ? LIGHT_STYLE
    : SATELLITE_STYLE;

  // Computed once — the map reads it on mount only.
  const initialViewState = useMemo(() => ({
    longitude: pins[0]?.lng ?? 0,
    latitude: pins[0]?.lat ?? 0,
    zoom: 14
  }), [pins]);

  const markers = useMemo(() => pins.map((pin, index) => (
    <PinMarker
      key={pin.id}
      pin={pin}
      index={index}
      isHovered={hoveredPinId === pin.id}
      onSelect={handleSelectPin}
    />
  )), [pins, hoveredPinId, handleSelectPin]);

  const popups = useMemo(() => pins
    .filter(pin => hoveredPinId === pin.id || popupInfo?.id === pin.id || pin.isMain)
    .map(pin => (
      <Popup
        key={pin.id}
        anchor="bottom"
        longitude={pin.lng}
        latitude={pin.lat}
        closeButton={false}
        closeOnClick={false}
        /* maplibre clamps popups to 240px by default; the building image sets its
           own width well under that. Text popups keep the default. */
        maxWidth={pin.isMain ? '200px' : undefined}
      >
        <PopupContent pin={pin} />
      </Popup>
    )), [pins, hoveredPinId, popupInfo]);

  if (!pins.length) return null;

  return (
    <div className="w-full h-full relative absolute inset-0">
      {/* Vignette Overlay for Dark/Satellite Mode */}
      {mapMode !== 'light' && (
        <div className="absolute inset-0 pointer-events-none z-[5] bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.7)_100%)]" />
      )}

      <Map
        reuseMaps
        ref={mapRef}
        initialViewState={initialViewState}
        mapStyle={currentStyle}
        style={{ width: '100%', height: '100%', position: 'absolute', zIndex: 1 }}
        onClick={handleMapClick}
        /* --- perf tuning ------------------------------------------------ */
        renderWorldCopies={false}   /* one globe, not three: fewer tiles to fetch and draw */
        antialias={false}           /* no extruded geometry here, so MSAA is pure cost */
        maxZoom={18}                /* stops runaway tile requests past useful detail */
        minZoom={9}
        fadeDuration={120}          /* shorter label cross-fade = less work while panning */
        dragRotate={false}          /* 2D locality map; removes a pitch/bearing render path */
        pitchWithRotate={false}
        touchPitch={false}
        /* attribution left at its default — CARTO/OSM/Esri require it */
      >
        {markers}
        {popups}
      </Map>

      {/* Map Style Toggle */}
      <button 
        onClick={() => setMapMode(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'satellite' : 'light')}
        className={`absolute bottom-4 left-4 z-50 group flex items-center gap-3 px-4 py-3 rounded-full hover:bg-[rgba(246,231,188,0.14)] backdrop-blur-2xl border transition-all duration-300 ${mapMode === 'light' ? 'bg-[rgba(11,10,8,0.15)] border-black/10 text-black shadow-lg' : 'bg-[rgba(246,231,188,0.08)] border-[rgba(201,169,97,0.28)] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(246,231,188,0.2)]'}`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border group-hover:scale-110 transition-transform ${mapMode === 'light' ? 'bg-[rgba(11,10,8,0.15)] border-black/20 text-black' : 'bg-[rgba(201,169,97,0.14)] border-[rgba(201,169,97,0.38)] text-[var(--gold-200)]'}`}>
          <Layers size={16} />
        </div>
        <div className="flex flex-col items-start mr-2">
          <span className={`text-[9px] font-bold tracking-[0.2em] uppercase leading-none mb-1 ${mapMode === 'light' ? 'text-black/60' : 'text-white/50'}`}>View</span>
          <span className={`text-xs font-medium tracking-wide leading-none capitalize ${mapMode === 'light' ? 'text-black' : 'text-white'}`}>
            {mapMode === 'light' ? 'Dark Map' : mapMode === 'dark' ? 'Satellite' : 'Light Map'}
          </span>
        </div>
      </button>
    </div>
  );
}
