import React from 'react';
import { ChevronUp } from 'lucide-react';
import gsap from 'gsap';

interface SceneHotspotProps {
  label: string;
  onClick: () => void;
}

export const SceneHotspot: React.FC<SceneHotspotProps> = ({ label, onClick }) => {
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, { scale: 1.1, duration: 0.3, ease: 'back.out(1.7)' });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: 'power2.out' });
  };

  return (
    <button
      className="group relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={`Go to ${label}`}
      title={label}
    >
      {/* Tooltip Label */}
      <div className="absolute bottom-full mb-3 px-3 py-1.5 bg-[rgba(11,10,8,0.75)] backdrop-blur-md rounded-full text-[var(--gold-200)] text-xs font-bold tracking-widest uppercase border border-[rgba(201,169,97,0.38)] shadow-[0_8px_24px_rgba(0,0,0,0.5)] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap">
        {label}
      </div>

      {/* Pulsing gold ring and arrow */}
      <div className="relative flex items-center justify-center w-12 h-12 bg-[rgba(201,169,97,0.14)] backdrop-blur-sm rounded-full border border-[rgba(201,169,97,0.55)] shadow-[0_0_22px_rgba(201,169,97,0.35),inset_0_1px_0_rgba(246,231,188,0.3)] hover:bg-[rgba(201,169,97,0.28)] hover:border-[var(--gold-300)] hover:shadow-[0_0_34px_rgba(201,169,97,0.6),inset_0_1px_0_rgba(246,231,188,0.45)] transition-all duration-300">
        <div className="absolute inset-0 rounded-full border border-[var(--gold-400)] animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-40" />
        <ChevronUp size={24} className="text-[var(--gold-100)] drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]" />
      </div>
    </button>
  );
};
