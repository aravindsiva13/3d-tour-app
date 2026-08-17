"use client";

import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, Popup, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin as MapPinType } from '@/lib/types';
import { Layers } from 'lucide-react';
import gsap from 'gsap';

interface MapCanvasProps {
  pins: MapPinType[];
  hoveredPinId?: string | null;
}

const AnimatedPin: React.FC<{ children: React.ReactNode, delay: number }> = ({ children, delay }) => {
  const pinRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (pinRef.current) {
      gsap.fromTo(pinRef.current,
        { opacity: 0, y: -50, scale: 0.5 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "bounce.out", delay, force3D: true }
      );
    }
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

  return (
    <div ref={contentRef} className="bg-black/80 backdrop-blur-2xl border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] rounded-2xl p-5 flex flex-col gap-1 min-w-[220px] pointer-events-auto">
      <strong className="text-sm font-bold uppercase tracking-widest text-white leading-tight">{pin.label}</strong>
      {pin.driveTime && <span className="text-xs text-white/70 font-medium mt-1">{pin.driveTime}</span>}
    </div>
  );
};

export default function MapCanvas({ pins, hoveredPinId }: MapCanvasProps) {
  const [popupInfo, setPopupInfo] = useState<MapPinType | null>(null);
  const [mapMode, setMapMode] = useState<'light' | 'dark' | 'satellite'>('light');
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    if (hoveredPinId && mapRef.current) {
      const pin = pins.find(p => p.id === hoveredPinId);
      if (pin) {
        const map = mapRef.current.getMap();
        if (map) {
          map.flyTo({
            center: [pin.lng, pin.lat],
            zoom: 15,
            duration: 1200,
            essential: true
          });
        }
      }
    }
  }, [hoveredPinId, pins]);

  // Click anywhere on map to close popup
  const handleMapClick = () => {
    setPopupInfo(null);
  };

  if (!pins.length) return null;

  const initialViewState = {
    longitude: pins[0].lng,
    latitude: pins[0].lat,
    zoom: 14
  };

  const satelliteStyle = {
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

  const currentStyle = mapMode === 'dark' 
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : mapMode === 'light'
    ? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
    : satelliteStyle;

  return (
    <div className="w-full h-full relative absolute inset-0">
      {/* Vignette Overlay for Dark/Satellite Mode */}
      {mapMode !== 'light' && (
        <div className="absolute inset-0 pointer-events-none z-[5] bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.7)_100%)]" />
      )}
      
      <Map
        reuseMaps={true}
        ref={mapRef}
        initialViewState={initialViewState}
        mapStyle={currentStyle}
        style={{ width: '100%', height: '100%', position: 'absolute', zIndex: 1 }}
        onClick={handleMapClick}
      >
      {pins.map((pin, index) => {
        const isHovered = hoveredPinId === pin.id;
        const showPopup = isHovered || popupInfo?.id === pin.id || pin.isMain;
        
        return (
          <React.Fragment key={pin.id}>
            <Marker 
              longitude={pin.lng} 
              latitude={pin.lat} 
              anchor="center"
              onClick={e => {
                e.originalEvent.stopPropagation();
                setPopupInfo(pin);
              }}
            >
              <AnimatedPin delay={index * 0.1}>
                {pin.isMain ? (
                  <div className={`relative flex items-center justify-center w-16 h-16 cursor-pointer group z-50 transition-transform duration-500 ${isHovered ? 'scale-125' : 'scale-100'}`}>
                    {/* Pulsating ring (Main Pin) */}
                    <div className="absolute inset-0 bg-[#d4af37] rounded-full opacity-30 animate-ping"></div>
                    <div className="absolute inset-2 bg-[#d4af37] rounded-full opacity-40 animate-pulse"></div>
                    {/* Core dot (Main Pin) */}
                    <div className="relative w-7 h-7 bg-[#d4af37] text-black font-bold text-[11px] rounded-full shadow-[0_0_20px_rgba(212,175,55,1)] border border-white/50 group-hover:scale-125 transition-transform duration-300 flex items-center justify-center">
                      {index + 1}
                    </div>
                  </div>
                ) : (
                  <div className={`relative flex items-center justify-center w-12 h-12 cursor-pointer group transition-transform duration-500 z-40 ${isHovered ? 'scale-125 z-50' : 'scale-100'}`}>
                    {/* Pulsating ring (Regular Pin) */}
                    <div className="absolute inset-2 bg-white rounded-full opacity-20 animate-ping"></div>
                    {/* Core dot (Regular Pin) */}
                    <div className={`relative w-6 h-6 rounded-full border shadow-lg flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${isHovered ? 'bg-white text-black border-white' : 'bg-black/60 backdrop-blur-md text-white border-white/50 group-hover:bg-white group-hover:text-black group-hover:border-white'}`}>
                      {index + 1}
                    </div>
                  </div>
                )}
              </AnimatedPin>
            </Marker>
            
            {showPopup && (
              <Popup
                anchor="bottom"
                longitude={pin.lng}
                latitude={pin.lat}
                closeButton={false}
                closeOnClick={false}
              >
                <PopupContent pin={pin} />
              </Popup>
            )}
          </React.Fragment>
        );
      })}
      </Map>

      {/* Map Style Toggle */}
      <button 
        onClick={() => setMapMode(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'satellite' : 'light')}
        className={`absolute bottom-4 left-4 z-50 group flex items-center gap-3 px-4 py-3 rounded-full hover:bg-white/20 backdrop-blur-2xl border transition-all duration-300 ${mapMode === 'light' ? 'bg-black/10 border-black/10 text-black shadow-lg' : 'bg-white/10 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)]'}`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border group-hover:scale-110 transition-transform ${mapMode === 'light' ? 'bg-black/10 border-black/20 text-black' : 'bg-white/10 border-white/20 text-white'}`}>
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
