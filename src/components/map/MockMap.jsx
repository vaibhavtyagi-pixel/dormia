import { useMemo } from 'react';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import countries110m from 'world-atlas/countries-110m.json';

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 500;

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
  const { countriesPath, graticulePath, positionedClusters } = useMemo(() => {
    const world = feature(countries110m, countries110m.objects.countries);
    const projection = geoNaturalEarth1().fitExtent(
      [
        [20, 20],
        [MAP_WIDTH - 20, MAP_HEIGHT - 20],
      ],
      world
    );
    const path = geoPath(projection);
    const countriesPathValue = path(world) ?? '';
    const graticulePathValue = path(geoGraticule10()) ?? '';
    const projectedClusters = clusters
      .map((cluster) => {
        const point = projection([cluster.lng, cluster.lat]);
        if (!point) return null;
        return { ...cluster, x: point[0], y: point[1] };
      })
      .filter(Boolean);

    return {
      countriesPath: countriesPathValue,
      graticulePath: graticulePathValue,
      positionedClusters: projectedClusters,
    };
  }, [clusters]);

  return (
    <div
      className={`card card-hover relative min-h-[380px] overflow-hidden bg-[#eef1f7] ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(to bottom, rgba(255,255,255,0.66), rgba(233,237,245,0.75)), radial-gradient(rgba(157,167,186,0.2) 1px, transparent 1px)',
        backgroundSize: '100% 100%, 20px 20px',
      }}
    >
      <svg className="absolute inset-0 h-full w-full opacity-100" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="none">
        <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="rgba(231,235,243,0.7)" />
        <path d={graticulePath} fill="none" stroke="rgba(173,183,198,0.35)" strokeWidth="1" />
        <path d={countriesPath} fill="rgba(201,206,216,0.96)" stroke="rgba(223,227,235,0.9)" strokeWidth="0.9" />
      </svg>
      {positionedClusters.map((cluster) => {
        const isMostlyAwake = cluster.awakeCount >= cluster.asleepCount;
        const bg = isMostlyAwake ? 'bg-amber' : 'bg-mint';
        const ring = isMostlyAwake ? 'rgba(251,191,36,0.35)' : 'rgba(110,231,183,0.35)';
        const size = Math.min(14 + cluster.total * 4, 36);
        return (
          <div
            key={cluster.key}
            className="group absolute"
            style={{
              left: `${(cluster.x / MAP_WIDTH) * 100}%`,
              top: `${(cluster.y / MAP_HEIGHT) * 100}%`,
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
