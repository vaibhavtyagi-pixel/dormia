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
      className={`card card-hover relative min-h-[380px] overflow-hidden bg-[#0b122e] ${className}`}
      style={{
        backgroundImage: 'radial-gradient(rgba(167,179,255,0.14) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <svg className="absolute inset-0 h-full w-full opacity-100" viewBox="0 0 1000 500" preserveAspectRatio="none">
        <path d="M80 190C130 130 220 120 290 160C350 195 330 260 265 280C200 300 120 280 90 240C70 220 70 205 80 190Z" fill="rgba(167,179,255,0.11)" />
        <path d="M380 120C460 90 560 95 625 140C700 190 670 265 590 290C520 312 440 298 402 246C372 206 350 145 380 120Z" fill="rgba(167,179,255,0.11)" />
        <path d="M705 160C760 130 835 135 890 170C935 200 932 256 883 282C825 312 755 302 720 258C686 214 675 180 705 160Z" fill="rgba(167,179,255,0.11)" />
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
      <div className="absolute right-3 top-3 rounded-full border border-border bg-card px-2 py-1 text-[10px] text-indigo-light">
        Built-in global map
      </div>
      <div className="absolute bottom-3 left-4 flex flex-wrap items-center gap-2 text-[10px]">
        <span className="rounded-full border border-border bg-card px-3 py-1 font-medium text-indigo-light">
          🌍 Global Live Map
        </span>
        <span className="rounded-full border border-border bg-card px-3 py-1 font-medium text-mint">
          😴 {asleepTotal} sleeping
        </span>
        <span className="rounded-full border border-border bg-card px-3 py-1 font-medium text-amber">
          ☀️ {awakeTotal} awake
        </span>
      </div>
    </div>
  );
}

export default MockMap;
