function toMapPosition(lat, lng) {
  const clampedLat = Math.max(-60, Math.min(80, lat));
  const left = ((lng + 180) / 360) * 100;
  const top = 90 - ((clampedLat + 60) / 140) * 80;
  return {
    left: Math.max(2, Math.min(98, left)),
    top: Math.max(10, Math.min(90, top)),
  };
}

function MockMap({ players, className = '' }) {
  return (
    <div
      className={`card card-hover relative min-h-[380px] overflow-hidden bg-[#13183a] ${className}`}
      style={{
        backgroundImage: 'radial-gradient(rgba(167,179,255,0.14) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <svg className="absolute inset-0 h-full w-full opacity-100" viewBox="0 0 1000 500" preserveAspectRatio="none">
        <path d="M80 190C130 130 220 120 290 160C350 195 330 260 265 280C200 300 120 280 90 240C70 220 70 205 80 190Z" fill="rgba(167,179,255,0.09)" />
        <path d="M380 120C460 90 560 95 625 140C700 190 670 265 590 290C520 312 440 298 402 246C372 206 350 145 380 120Z" fill="rgba(167,179,255,0.09)" />
        <path d="M705 160C760 130 835 135 890 170C935 200 932 256 883 282C825 312 755 302 720 258C686 214 675 180 705 160Z" fill="rgba(167,179,255,0.09)" />
      </svg>

      {players.map((player) => {
        const position = toMapPosition(player.lat, player.lng);
        return (
          <div
            key={player.uid}
            className="group absolute"
            style={{ top: `${position.top}%`, left: `${position.left}%`, transform: 'translate(-50%, -50%)' }}
          >
            <div
              className={`h-3 w-3 rounded-full ${player.isAsleep ? 'bg-mint' : 'bg-amber animate-flicker-awake'}`}
              style={{
                boxShadow: player.isAsleep
                  ? '0 0 0 4px rgba(110, 231, 183, 0.25)'
                  : '0 0 0 4px rgba(251, 191, 36, 0.25)',
              }}
              title={player.displayName}
            />
            <div className="pointer-events-none absolute -top-[86px] left-1/2 w-44 -translate-x-1/2 rounded-xl border border-border bg-card p-2 text-[13px] text-ink opacity-0 transition group-hover:opacity-100">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-pale font-mono text-xs text-indigo">
                  {player.displayName.charAt(0)}
                </span>
                <div>
                  <p className="text-[13px] font-medium">{player.displayName}</p>
                  <p className="text-[12px] text-text-secondary">
                    {player.isAsleep ? 'Sleeping 😴' : 'Awake ☀️'}
                  </p>
                </div>
              </div>
              <p className="mt-1 text-[12px] text-text-secondary">{player.currentStreak} day streak</p>
            </div>
          </div>
        );
      })}

      <p className="absolute bottom-3 left-4 rounded-full border border-border bg-card px-3 py-1 text-[10px] font-medium text-indigo-light">
        🌍 Live Map · Google Maps connects soon
      </p>
    </div>
  );
}

export default MockMap;
