import { useEffect, useMemo, useRef, useState } from 'react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
let googleMapsPromise = null;

const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#0a102b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#c7d2fe' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a102b' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1f2a56' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8b9be0' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#11183a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1b2650' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#060a1f' }] },
];

function loadGoogleMapsApi(apiKey) {
  if (!apiKey) {
    return Promise.reject(new Error('Missing Google Maps API key'));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (googleMapsPromise) {
    return googleMapsPromise;
  }
  googleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = '__dormiaGoogleMapsLoaded';
    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      reject(new Error('Google Maps auth failure: key, billing, or referrer restriction'));
      if (typeof previousAuthFailure === 'function') previousAuthFailure();
    };
    window[callbackName] = () => {
      resolve(window.google.maps);
      delete window[callbackName];
      window.gm_authFailure = previousAuthFailure;
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });
  return googleMapsPromise;
}

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
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const [mapError, setMapError] = useState('');

  const clusters = useMemo(() => clusterPlayers(players), [players]);
  const asleepTotal = useMemo(() => players.filter((item) => item.isAsleep).length, [players]);
  const awakeTotal = players.length - asleepTotal;

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setMapError('Missing VITE_GOOGLE_MAPS_API_KEY');
      return undefined;
    }
    let cancelled = false;
    loadGoogleMapsApi(GOOGLE_MAPS_API_KEY)
      .then((maps) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        mapRef.current = new maps.Map(containerRef.current, {
          center: { lat: 10, lng: 0 },
          zoom: 2,
          minZoom: 2,
          maxZoom: 10,
          disableDefaultUI: true,
          zoomControl: true,
          styles: mapStyles,
          gestureHandling: 'greedy',
          backgroundColor: '#070c20',
        });
      })
      .catch((error) => {
        if (!cancelled) setMapError(error.message || 'Google Maps failed to initialize');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.google?.maps;
    if (!map || !maps) return;

    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    clusters.forEach((cluster) => {
      const center = { lat: cluster.lat, lng: cluster.lng };
      const isMostlyAwake = cluster.awakeCount >= cluster.asleepCount;
      const fillColor = isMostlyAwake ? '#fbbf24' : '#6ee7b7';
      const strokeColor = isMostlyAwake ? '#fde68a' : '#a7f3d0';
      const radius = 12000 + Math.max(0, cluster.total - 1) * 8500;

      const area = new maps.Circle({
        map,
        center,
        radius,
        fillColor,
        fillOpacity: 0.28,
        strokeColor,
        strokeOpacity: 0.9,
        strokeWeight: 1.5,
      });

      const marker = new maps.Marker({
        map,
        position: center,
        label: {
          text: `${cluster.total}`,
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: '700',
        },
        icon: {
          path: maps.SymbolPath.CIRCLE,
          fillColor,
          fillOpacity: 0.95,
          scale: Math.min(10 + cluster.total * 2.5, 26),
          strokeColor: '#0b122e',
          strokeWeight: 1.5,
        },
      });

      const infoWindow = new maps.InfoWindow({
        content: `
          <div style="font-family: Inter, sans-serif; min-width: 180px;">
            <div style="font-weight: 700; margin-bottom: 6px;">${cluster.total} players in this area</div>
            <div style="font-size: 12px; margin-bottom: 4px;">😴 Sleeping: ${cluster.asleepCount}</div>
            <div style="font-size: 12px; margin-bottom: 6px;">☀️ Awake: ${cluster.awakeCount}</div>
            <div style="font-size: 11px; color: #5f6b9a;">${cluster.names.slice(0, 4).join(', ')}${cluster.names.length > 4 ? ', ...' : ''}</div>
          </div>
        `,
      });
      marker.addListener('click', () => infoWindow.open({ map, anchor: marker }));

      overlaysRef.current.push(area, marker);
    });
  }, [clusters]);

  const fallbackMap = (
    <div
      className="relative h-full min-h-[380px] w-full overflow-hidden bg-[#10183a]"
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
      <div className="absolute right-3 top-3 rounded-full border border-border bg-card px-2 py-1 text-[10px] text-amber">
        Fallback visual map active
      </div>
    </div>
  );

  return (
    <div className={`card card-hover relative min-h-[380px] overflow-hidden bg-[#0b122e] ${className}`}>
      {mapError ? fallbackMap : <div ref={containerRef} className="h-full min-h-[380px] w-full" />}
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
      {mapError ? (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-border bg-card px-3 py-1 text-[10px] text-amber">
          Google Maps unavailable: {mapError}
        </div>
      ) : null}
    </div>
  );
}

export default MockMap;
