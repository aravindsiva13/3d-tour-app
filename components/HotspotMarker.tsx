import React from 'react';

interface HotspotMarkerProps {
  id: string;
  x: number;
  y: number;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const HotspotMarker: React.FC<HotspotMarkerProps> = ({ x, y, label, onClick, disabled }) => {
  return (
    <button
      className="hotspot-marker group"
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Navigate to ${label}`}
    >
      <div className="hotspot-ring-container">
        <svg width="40" height="40" viewBox="0 0 40 40" className="hotspot-ring">
          <circle cx="20" cy="20" r="18" fill="rgba(19, 26, 23, 0.4)" stroke="var(--hairline)" strokeWidth="1" />
          <circle className="hotspot-progress" cx="20" cy="20" r="18" fill="none" stroke="var(--brass)" strokeWidth="2" />
        </svg>
        <div className="hotspot-core" />
      </div>
      <div className="hotspot-label-container">
        <div className="hotspot-rule" />
        <span className="hotspot-label">{label}</span>
      </div>
    </button>
  );
};
