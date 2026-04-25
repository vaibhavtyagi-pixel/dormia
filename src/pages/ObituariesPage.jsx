import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase.js';

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return null;
}

function ObituariesPage() {
  const [liveObituaries, setLiveObituaries] = useState([]);

  useEffect(() => {
    if (!db) {
      setLiveObituaries([]);
      return undefined;
    }
    const obituariesQuery = query(collection(db, 'obituaries'), orderBy('timeOfDeath', 'desc'), limit(20));
    const unsubscribe = onSnapshot(
      obituariesQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setLiveObituaries([]);
          return;
        }
        setLiveObituaries(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      },
      () => {
        setLiveObituaries([]);
      }
    );

    return () => unsubscribe();
  }, []);

  const items = useMemo(
    () =>
      [...liveObituaries].sort((a, b) => {
        const aDate = toDate(a?.timeOfDeath);
        const bDate = toDate(b?.timeOfDeath);
        return (bDate?.getTime() ?? 0) - (aDate?.getTime() ?? 0);
      }),
    [liveObituaries]
  );

  const lostThisWeek = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    return items.filter((item) => {
      const date = toDate(item?.timeOfDeath);
      if (!date || Number.isNaN(date.getTime())) return false;
      return now - date.getTime() <= weekMs;
    }).length;
  }, [items]);

  return (
    <section className="animate-fade-up">
      <div className="card relative mb-6 flex flex-wrap items-start justify-between gap-4 overflow-hidden p-5">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 160 80"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <pattern id="tinyMoons" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <g transform="translate(4,4)">
                <circle cx="7" cy="7" r="5" fill="#a7b3ff" />
                <circle cx="9.8" cy="6.2" r="5" fill="#111428" />
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#tinyMoons)" />
        </svg>
        <div className="relative z-10">
          <h2 className="font-sora text-4xl font-extrabold tracking-tight text-indigo">Lost Streaks</h2>
          <p className="mt-2 italic text-text-secondary">
            These people had a plan. The internet had other ideas.
          </p>
        </div>
        <article className="card relative z-10 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.12em] text-text-secondary">This Week</p>
          <p className="font-mono text-3xl text-indigo">{lostThisWeek}</p>
          <p className="text-sm text-text-secondary">streaks lost</p>
        </article>
      </div>

      <div className="mt-8 space-y-5">
        {items.length === 0 ? (
          <>
            <article className="card border border-border bg-card p-5 text-sm text-text-secondary">
              No lost streak records yet.
            </article>
            <article className="card relative overflow-hidden p-6 opacity-90">
              <div
                className="absolute inset-0 rounded-[16px] pointer-events-none"
                style={{
                  border: '1px solid rgba(255, 80, 80, 0.3)',
                  boxShadow: '0 0 12px rgba(255, 80, 80, 0.1)',
                }}
              />
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-sora text-2xl font-bold text-white">Alex</h3>
                <span className="font-mono text-sm text-[#5DE2B1]">7-day streak</span>
              </div>
              <p className="relative z-10 mt-3 font-mono text-sm text-[#DDE3FF]">Example public obituary</p>
              <p className="relative z-10 mt-4 text-base italic text-white/90">
                Here lies Alex&apos;s 7-day streak. Killed at 2:47am by what appears to have been Netflix autoplay. Survived by three missed alarms and one very regrettable life decision. They were doing so well.
              </p>
            </article>
          </>
        ) : null}
        {items.map((obituary, index) => {
          const date = toDate(obituary?.timeOfDeath);
          const formattedDate = date?.toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          });

          return (
            <article
              key={obituary.id}
              className="animate-fade-down card relative overflow-hidden p-6"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className="absolute inset-0 rounded-[16px] pointer-events-none"
                style={{
                  border: '1px solid rgba(255, 80, 80, 0.3)',
                  boxShadow: '0 0 12px rgba(255, 80, 80, 0.1)',
                }}
              />
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-sora text-2xl font-bold text-white">{obituary.displayName ?? 'Unknown player'}</h3>
                <span className="font-mono text-sm text-[#5DE2B1]">
                  {Number(obituary?.streakLength) || 0}-day streak
                </span>
              </div>
              <p className="relative z-10 mt-3 font-mono text-sm text-[#DDE3FF]">
                {formattedDate ?? 'Unknown date'}
              </p>
              <p className="relative z-10 mt-4 text-base italic text-white/90">
                {obituary.obituaryText ?? 'No obituary text available.'}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default ObituariesPage;
