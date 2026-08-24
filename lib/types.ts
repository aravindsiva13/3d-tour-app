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
  /**
   * Heading (same yaw convention as links) to face on arriving at this node.
   *
   * Each panorama was rendered with its own arbitrary orientation, so carrying
   * the previous room's camera yaw across a transition lands you pointing in a
   * meaningless direction — often straight at a wall. When set, the camera is
   * snapped to this heading while the transition overlay is still opaque, so
   * you always arrive looking into the room. Omit to keep the incoming yaw.
   */
  entryYaw?: number;
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
