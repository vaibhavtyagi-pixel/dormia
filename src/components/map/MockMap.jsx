import { useMemo } from 'react';

function toMapPosition(lat, lng) {
  const clampedLat = Math.max(-60, Math.min(80, lat));
  const left = ((lng + 180) / 360) * 100;
  const top = 90 - ((clampedLat + 60) / 140) * 80;
  return {
    left: Math.max(3, Math.min(97, left)),
    top: Math.max(12, Math.min(88, top)),
  };
}

function clusterPlayers(players) {
  const clusters = new Map();
  players.forEach((player) => {
    const lat = Number(player.lat);
    const lng = Number(player.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    if (!clusters.has(key)) {
      clusters.set(key, {
        key,
        lat,
        lng,
        total: 0,
        asleepCount: 0,
        awakeCount: 0,
        names: [],
      });
    }
    const cluster = clusters.get(key);
    cluster.total += 1;
    if (player.isAsleep) cluster.asleepCount += 1;
    else cluster.awakeCount += 1;
    cluster.names.push(player.displayName ?? 'Player');
  });
  return [...clusters.values()];
}

function MockMap({ players, className = '' }) {
  const clusters = useMemo(() => clusterPlayers(players), [players]);
  const asleepTotal = useMemo(() => players.filter((item) => item.isAsleep).length, [players]);
  const awakeTotal = players.length - asleepTotal;

  return (
    <div
      className={`card card-hover relative min-h-[380px] overflow-hidden bg-[#eef1f7] ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(to bottom, rgba(255,255,255,0.66), rgba(233,237,245,0.75)), radial-gradient(rgba(157,167,186,0.2) 1px, transparent 1px)',
        backgroundSize: '100% 100%, 20px 20px',
      }}
    >
      <svg className="absolute inset-0 h-full w-full opacity-100" viewBox="0 0 1000 500" preserveAspectRatio="none">
        <rect x="0" y="0" width="1000" height="500" fill="rgba(231,235,243,0.7)" />
        <g fill="none" stroke="rgba(173,183,198,0.35)" strokeWidth="1">
          <path d="M0 120 H1000" />
          <path d="M0 180 H1000" />
          <path d="M0 240 H1000" />
          <path d="M0 300 H1000" />
          <path d="M0 360 H1000" />
        </g>
        <g fill="rgba(201,206,216,0.96)" stroke="rgba(223,227,235,0.9)" strokeWidth="1.1">
          <path d="M66 120L98 95L142 88L190 96L230 118L254 142L272 165L304 176L314 206L290 236L242 264L192 274L154 266L118 246L84 220L62 192L50 160Z" />
          <path d="M260 288L286 274L310 288L324 318L306 344L278 352L252 334Z" />
          <path d="M420 94L450 82L498 84L540 100L578 96L618 110L650 132L638 152L600 170L570 188L556 220L530 248L496 270L466 290L438 286L412 264L396 236L382 204L364 184L356 154L374 126Z" />
          <path d="M536 286L562 280L584 292L596 314L590 342L572 366L552 392L532 410L510 398L500 372L508 342L520 318Z" />
          <path d="M620 112L662 92L720 82L774 90L814 106L842 134L866 160L896 184L910 206L902 228L874 242L840 246L818 264L792 282L754 296L722 286L690 270L670 246L658 220L640 196L628 172L614 150Z" />
          <path d="M836 304L868 296L900 304L922 322L928 344L912 360L882 370L852 360L834 340Z" />
        </g>
      </svg>
      {clusters.map((cluster) => {
        const pos = toMapPosition(cluster.lat, cluster.lng);
        const isMostlyAwake = cluster.awakeCount >= cluster.asleepCount;
        const bg = isMostlyAwake ? 'bg-amber' : 'bg-mint';
        const ring = isMostlyAwake ? 'rgba(251,191,36,0.35)' : 'rgba(110,231,183,0.35)';
        const size = Math.min(14 + cluster.total * 4, 36);
        return (
          <div
            key={cluster.key}
            className="group absolute"
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className={`rounded-full ${bg} flex items-center justify-center font-mono text-[11px] font-semibold text-[#0b122e]`}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                boxShadow: `0 0 0 6px ${ring}`,
              }}
            >
              {cluster.total}
            </div>
            <div className="pointer-events-none absolute -top-[92px] left-1/2 w-48 -translate-x-1/2 rounded-xl border border-border bg-card p-2 text-[12px] text-ink opacity-0 transition group-hover:opacity-100">
              <p className="font-semibold">{cluster.total} users in area</p>
              <p className="text-text-secondary">😴 {cluster.asleepCount} sleeping · ☀️ {cluster.awakeCount} awake</p>
              <p className="truncate text-[11px] text-text-secondary">{cluster.names.join(', ')}</p>
            </div>
          </div>
        );
      })}
      <div className="absolute right-3 top-3 rounded-full border border-[#d9deeb] bg-white/90 px-2 py-1 text-[10px] text-[#64708d]">
        Built-in global map
      </div>
      <div className="absolute bottom-3 left-4 flex flex-wrap items-center gap-2 text-[10px]">
        <span className="rounded-full border border-[#d9deeb] bg-white/90 px-3 py-1 font-medium text-[#4a5d86]">
          🌍 Global Live Map
        </span>
        <span className="rounded-full border border-[#d9deeb] bg-white/90 px-3 py-1 font-medium text-[#2f8e74]">
          😴 {asleepTotal} sleeping
        </span>
        <span className="rounded-full border border-[#d9deeb] bg-white/90 px-3 py-1 font-medium text-[#b67e0e]">
          ☀️ {awakeTotal} awake
        </span>
      </div>
    </div>
  );
}

export default MockMap;
