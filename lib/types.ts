export const HUB = 'hub';

export interface VideoSegment {
  id: string;
  label: string;
  videoUrl: string;
}

export interface GalleryConfig {
  interior: string[];
  exterior: string[];
}

export interface FloorPlanHotspot {
  id: string;
  x: number; // percentage from left
  y: number; // percentage from top
  title: string;
  images: string[];
}

export interface FloorPlan {
  id: string;
  name: string;
  carpetArea: string;
  builtUpArea: string;
  facing: string;
  image: string;
  hotspots?: FloorPlanHotspot[];
}

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  driveTime: string;
  isMain?: boolean;
  category?: string;
}

export interface VirtualTourLink {
  nodeId: string;
  label: string;
  yaw: number;
  pitch: number;
}

export interface VirtualTourNode {
  src: string;
  name: string;
  links: VirtualTourLink[];
}

export interface VirtualTourConfig {
  defaultNode: string;
  nodes: Record<string, VirtualTourNode>;
}

export interface ProjectConfig {
  homePoster: string;
  videoSegments: VideoSegment[];
  gallery: GalleryConfig;
  floorPlans?: FloorPlan[];
  mapPins?: MapPin[];
  virtualTour?: VirtualTourConfig;
}
