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
    window[callbackName] = () => {
      resolve(window.google.maps);
      delete window[callbackName];
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

  return (
    <div className={`card card-hover relative min-h-[380px] overflow-hidden bg-[#0b122e] ${className}`}>
      <div ref={containerRef} className="h-full min-h-[380px] w-full" />
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
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b122e]/90 p-4 text-center text-xs text-amber">
          Google Maps unavailable: {mapError}
        </div>
      ) : null}
    </div>
  );
}

export default MockMap;
