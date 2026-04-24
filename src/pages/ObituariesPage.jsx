import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../firebase.js';

const accentColors = ['bg-indigo', 'bg-amber', 'bg-mint'];
const continentEmoji = {
  Europe: '🇪🇺',
  Americas: '🌎',
  Asia: '🌏',
  Africa: '🌍',
  Oceania: '🌊',
};

function ObituariesPage() {
  const { players } = useAuth();
  const [liveObituaries, setLiveObituaries] = useState([]);

  useEffect(() => {
    const obituariesQuery = query(collection(db, 'obituaries'), orderBy('timeOfDeath', 'desc'), limit(10));
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

  const items = [...liveObituaries].sort(
    (a, b) => new Date(b.timeOfDeath).getTime() - new Date(a.timeOfDeath).getTime()
  );

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
          <p className="font-mono text-3xl text-indigo">{items.length}</p>
          <p className="text-sm text-text-secondary">streaks lost</p>
        </article>
      </div>

      <div className="mt-8 space-y-5">
        {items.length === 0 ? (
          <article className="card border border-border bg-card p-5 text-sm text-text-secondary">
            No lost streak records yet in Firebase.
          </article>
        ) : null}
        {items.map((obituary, index) => {
          const matchingPlayer = (players ?? []).find((player) => player.displayName === obituary.displayName);
          const continent = matchingPlayer?.continent ?? 'World';
          const cause = obituary?.cause ?? obituary?.reason ?? 'a streak break event';
          const date = new Date(obituary.timeOfDeath);
          const formattedDate = date.toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          });

          return (
            <article
              key={obituary.id}
              className="animate-fade-up card card-hover relative overflow-hidden border-amber-pale bg-amber-warm p-6"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <span className={`absolute left-0 top-0 h-full w-1 ${accentColors[index % accentColors.length]}`} />
              <span className="pointer-events-none absolute right-4 top-1 text-[64px] leading-none text-ink/5">💤</span>

              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-pale font-mono text-sm text-indigo">
                  {obituary.displayName.charAt(0)}
                </span>
                <div>
                  <h3 className="font-sora text-2xl font-bold text-ink">
                    {obituary.displayName} {continentEmoji[continent] || '🌍'}
                  </h3>
                  <span className="mt-1 inline-block rounded-full bg-indigo-pale px-3 py-1 text-sm font-medium text-indigo">
                    {obituary.streakLength}-day streak
                  </span>
                </div>
              </div>

              <p className="mt-4 text-[13px] italic text-text-secondary">💤 Taken by {cause}</p>
              <p className="mt-3 text-sm text-text-secondary">
                {obituary.obituaryText ?? obituary.message ?? 'No additional details were recorded for this streak loss.'}
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-sm text-text-secondary">{formattedDate.replace(',', ' ·')}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-border bg-transparent px-3 py-1 text-xs text-text-secondary"
                  >
                    Share
                  </button>
                  <span className="rounded-full bg-amber-pale px-2 py-1 text-xs text-ink">
                    RIP {obituary.streakLength} days
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default ObituariesPage;
