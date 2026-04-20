import AwakeCounter from '../components/map/AwakeCounter.jsx';
import MockMap from '../components/map/MockMap.jsx';
import { mockPlayers } from '../mockData.js';

function LivePage() {
  const awakeCount = mockPlayers.filter((player) => !player.isAsleep).length;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-base px-4 py-10 text-center text-ink animate-fade-up">
      <header>
        <h1 className="font-sora text-5xl font-extrabold tracking-tight text-indigo md:text-7xl">DORMIA</h1>
        <p className="mt-2 text-lg italic text-text-secondary md:text-2xl">Sleep is now a sport.</p>
      </header>

      <div className="flex w-full max-w-6xl flex-col gap-4 md:relative">
        <MockMap players={mockPlayers} className="h-[55vh] min-h-[360px] w-full" />
        <AwakeCounter count={awakeCount} className="mx-auto md:absolute md:right-6 md:top-6" />
      </div>

      <p className="text-xs text-text-secondary">dormia.vercel.app/live</p>
    </main>
  );
}

export default LivePage;
