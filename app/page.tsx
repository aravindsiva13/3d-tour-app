import { project } from '@/config/project';
import { VideoNavigator } from '@/components/VideoNavigator';

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black text-white">
      <VideoNavigator project={project} />
    </main>
  );
}
