import re

with open("components/PanoramaViewer.tsx", "r") as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "import { OrbitControls, useTexture, useProgress } from '@react-three/drei';",
    "import { OrbitControls, useTexture, useProgress, Html } from '@react-three/drei';"
)
content = content.replace(
    "import { VirtualTourConfig } from '@/lib/types';",
    "import { VirtualTourConfig, VirtualTourLink } from '@/lib/types';\nimport { SceneHotspot } from './SceneHotspot';"
)

# 2. Add TourHotspots component before PanoramaSphere
tour_hotspots = """
// Convert yaw/pitch (in degrees) to 3D Cartesian coordinates
const getHotspotPosition = (yaw: number, pitch: number, radius = 450): [number, number, number] => {
  const phi = THREE.MathUtils.degToRad(90 - pitch);
  const theta = THREE.MathUtils.degToRad(yaw);
  
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return [x, y, z];
};

const TourHotspots = ({ links, onNavigate }: { links: VirtualTourLink[], onNavigate: (nodeId: string) => void }) => {
  return (
    <>
      {links.map((link, idx) => (
        <Html
          key={idx}
          position={getHotspotPosition(link.yaw, link.pitch)}
          center
          zIndexRange={[100, 0]}
        >
          <SceneHotspot label={link.label} onClick={() => onNavigate(link.nodeId)} />
        </Html>
      ))}
    </>
  );
};

"""
content = content.replace("// 2. The 3D Panorama Sphere", tour_hotspots + "// 2. The 3D Panorama Sphere")

# 3. Update PanoramaSphere
old_sphere = """const PanoramaSphere = ({ src }: { src: string }) => {
  const texture = useTexture(src);
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  );
};"""

new_sphere = """const PanoramaSphere = ({ src, editMode }: { src: string, editMode: boolean }) => {
  const texture = useTexture(src);
  
  const handleClick = (e: any) => {
    if (!editMode) return;
    
    // Calculate intersection point relative to the center
    const point = e.point;
    
    // Calculate spherical coordinates from cartesian
    const radius = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
    const phi = Math.acos(point.y / radius);
    const theta = Math.atan2(point.z, point.x);

    let pitch = 90 - THREE.MathUtils.radToDeg(phi);
    let yaw = THREE.MathUtils.radToDeg(theta);

    const logMsg = {
      yaw: parseFloat(yaw.toFixed(2)),
      pitch: parseFloat(pitch.toFixed(2))
    };
    
    console.log(`%c[Hotspot Edit Mode]`, 'color: #00ff00; font-weight: bold', logMsg);
    alert(`Yaw: ${logMsg.yaw}, Pitch: ${logMsg.pitch}\\nCheck console for JSON.`);
  };

  return (
    <mesh scale={[-1, 1, 1]} onClick={handleClick}>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  );
};"""
content = content.replace(old_sphere, new_sphere)


# 4. Add editMode state and key listener, update Suspense block
old_viewer_start = """export const PanoramaViewer: React.FC<PanoramaViewerProps> = ({ config, onClose }) => {
  // Track current room natively in this component so we don't have to unmount the viewer
  const [currentNodeId, setCurrentNodeId] = useState(config.defaultNode);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);"""

new_viewer_start = """export const PanoramaViewer: React.FC<PanoramaViewerProps> = ({ config, onClose }) => {
  // Track current room natively in this component so we don't have to unmount the viewer
  const [currentNodeId, setCurrentNodeId] = useState(config.defaultNode);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

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
  }, []);"""

content = content.replace(old_viewer_start, new_viewer_start)

old_suspense = """          <Suspense fallback={null}>
            {/* When currentNode.src changes, Suspense automatically triggers the loading spinner again */}
            <PanoramaSphere src={currentNode.src} />
          </Suspense>"""

new_suspense = """          <Suspense fallback={null}>
            {/* When currentNode.src changes, Suspense automatically triggers the loading spinner again */}
            <PanoramaSphere src={currentNode.src} editMode={editMode} />
            <TourHotspots links={currentNode.links || []} onNavigate={(nodeId) => setCurrentNodeId(nodeId)} />
          </Suspense>"""

content = content.replace(old_suspense, new_suspense)

old_edit_banner = ""
new_edit_banner = """      {editMode && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-red-500/80 backdrop-blur-md px-6 py-2 rounded-full border border-red-400 text-white text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(255,0,0,0.5)] animate-pulse">
          Edit Mode Active: Click anywhere to log yaw/pitch
        </div>
      )}"""

# Insert edit banner after Top UI (around line 235)
content = content.replace("{/* Top UI */}", new_edit_banner + "\n\n      {/* Top UI */}")


with open("components/PanoramaViewer.tsx", "w") as f:
    f.write(content)
print("Updated PanoramaViewer.tsx")
