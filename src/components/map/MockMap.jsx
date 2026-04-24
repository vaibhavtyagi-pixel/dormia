import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import countries110m from 'world-atlas/countries-110m.json';

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 500;
const MIN_ZOOM = 1;
const MAX_ZOOM = 12;

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
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const zoomHoldRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
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

  const applyZoom = useCallback((nextZoom) => {
    setZoom(() => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom)));
  }, []);

  const adjustZoom = useCallback((delta) => {
    setZoom((currentZoom) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom + delta)));
  }, []);

  const getPanBounds = useCallback((activeZoom) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { maxX: 0, maxY: 0 };
    return {
      maxX: ((activeZoom - 1) * rect.width) / 2,
      maxY: ((activeZoom - 1) * rect.height) / 2,
    };
  }, []);

  const clampPan = useCallback(
    (nextPan, activeZoom) => {
      const { maxX, maxY } = getPanBounds(activeZoom);
      return {
        x: Math.max(-maxX, Math.min(maxX, nextPan.x)),
        y: Math.max(-maxY, Math.min(maxY, nextPan.y)),
      };
    },
    [getPanBounds]
  );

  const handleWheelZoom = useCallback(
    (event) => {
      event.preventDefault();
      const sensitivity = event.ctrlKey ? 0.02 : 0.008;
      const delta = -event.deltaY * sensitivity;
      adjustZoom(delta);
    },
    [adjustZoom]
  );

  useEffect(() => {
    setPan((currentPan) => clampPan(currentPan, zoom));
  }, [clampPan, zoom]);

  const handlePointerDown = useCallback(
    (event) => {
      if (event.target?.closest?.('button')) return;
      if (zoom <= 1) return;
      setIsDragging(true);
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: pan.x,
        originY: pan.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [pan.x, pan.y, zoom]
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!isDragging || !dragRef.current) return;
      const nextX = dragRef.current.originX + (event.clientX - dragRef.current.startX);
      const nextY = dragRef.current.originY + (event.clientY - dragRef.current.startY);
      setPan(clampPan({ x: nextX, y: nextY }, zoom));
    },
    [clampPan, isDragging, zoom]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  const stopZoomHold = useCallback(() => {
    if (zoomHoldRef.current) {
      window.clearInterval(zoomHoldRef.current);
      zoomHoldRef.current = null;
    }
  }, []);

  const startZoomHold = useCallback(
    (delta) => {
      stopZoomHold();
      adjustZoom(delta);
      zoomHoldRef.current = window.setInterval(() => adjustZoom(delta), 85);
    },
    [adjustZoom, stopZoomHold]
  );

  useEffect(() => () => stopZoomHold(), [stopZoomHold]);

  const handleKeyZoom = useCallback(
    (event) => {
      if (event.key === 'ArrowUp' || event.key === '+' || event.key === '=') {
        event.preventDefault();
        adjustZoom(0.2);
      } else if (event.key === 'ArrowDown' || event.key === '-') {
        event.preventDefault();
        adjustZoom(-0.2);
      } else if (event.key === '0') {
        event.preventDefault();
        applyZoom(1);
      }
    },
    [adjustZoom, applyZoom]
  );

  return (
    <div
      ref={containerRef}
      className={`card card-hover relative min-h-[380px] overflow-hidden bg-[#eef1f7] ${className}`}
      onWheel={handleWheelZoom}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onKeyDown={handleKeyZoom}
      tabIndex={0}
      style={{
        backgroundImage:
          'linear-gradient(to bottom, rgba(255,255,255,0.66), rgba(233,237,245,0.75)), radial-gradient(rgba(157,167,186,0.2) 1px, transparent 1px)',
        backgroundSize: '100% 100%, 20px 20px',
        cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        touchAction: 'none',
      }}
    >
      <div
        className="absolute inset-0 transition-transform duration-200 ease-out"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
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
      </div>
      <div className="absolute right-3 top-3 rounded-full border border-[#d9deeb] bg-white/90 px-2 py-1 text-[10px] text-[#64708d]">
        Built-in global map · {zoom.toFixed(1)}x
      </div>
      <div className="absolute right-3 top-10 flex items-center gap-1 rounded-full border border-[#d9deeb] bg-white/95 p-1">
        <button
          type="button"
          className="h-7 w-7 rounded-full border border-[#d9deeb] text-sm font-semibold text-[#42567d] hover:bg-[#f1f4fb]"
          onClick={() => adjustZoom(-0.25)}
          onPointerDown={(event) => {
            event.stopPropagation();
            startZoomHold(-0.12);
          }}
          onPointerUp={stopZoomHold}
          onPointerLeave={stopZoomHold}
          aria-label="Zoom out map"
        >
          -
        </button>
        <button
          type="button"
          className="h-7 w-7 rounded-full border border-[#d9deeb] text-sm font-semibold text-[#42567d] hover:bg-[#f1f4fb]"
          onClick={() => applyZoom(1)}
          aria-label="Reset map zoom"
        >
          1:1
        </button>
        <button
          type="button"
          className="h-7 w-7 rounded-full border border-[#d9deeb] text-sm font-semibold text-[#42567d] hover:bg-[#f1f4fb]"
          onClick={() => adjustZoom(0.25)}
          onPointerDown={(event) => {
            event.stopPropagation();
            startZoomHold(0.12);
          }}
          onPointerUp={stopZoomHold}
          onPointerLeave={stopZoomHold}
          aria-label="Zoom in map"
        >
          +
        </button>
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
