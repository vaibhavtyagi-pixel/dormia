import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { mockWinners } from '../mockWinners.js';
import { mockCurrentUser } from '../mockData.js';

const continents = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];

function ProfilePage() {
  const { playerData, settings, saveSettings, players, isLoading } = useAuth();
  const safePlayerData = playerData ?? mockCurrentUser;
  const [sleepTarget, setSleepTarget] = useState(settings.sleepTarget);
  const [continent, setContinent] = useState(settings.continent);
  const [hasAndroidApk, setHasAndroidApk] = useState(settings.hasAndroidApk);
  const [showToast, setShowToast] = useState(false);
  const ranking = [...players].sort((a, b) => b.xp - a.xp).findIndex((player) => player.uid === safePlayerData.uid) + 1;
  const safeXp = Number(safePlayerData.xp) || 0;
  const nextMilestone = Math.ceil(safeXp / 500) * 500;
  const milestoneProgress = nextMilestone > 0 ? (safeXp / nextMilestone) * 100 : 0;
  const rankTitle = (() => {
    if (safeXp < 500) return 'Night Owl 🦉';
    if (safeXp < 1000) return 'Early Riser 🌅';
    if (safeXp < 2000) return 'Dream Chaser 💫';
    if (safeXp < 5000) return 'Sleep Athlete 🏃';
    return 'Slumber Legend 👑';
  })();
  const winStats = mockWinners.reduce(
    (accumulator, entry) => {
      if (entry.winnerUid === safePlayerData.uid) {
        accumulator.total += 1;
        accumulator.byLeague[entry.league] = (accumulator.byLeague[entry.league] ?? 0) + 1;
      }
      return accumulator;
    },
    { total: 0, byLeague: {} }
  );

  useEffect(() => {
    setSleepTarget(settings.sleepTarget);
    setContinent(settings.continent);
    setHasAndroidApk(settings.hasAndroidApk);
  }, [settings.sleepTarget, settings.continent, settings.hasAndroidApk]);

  if (isLoading && !playerData) {
    return <section className="animate-fade-up min-h-[40vh]" />;
  }

  const handleSave = (event) => {
    event.preventDefault();
    saveSettings({ sleepTarget: Number(sleepTarget), continent, hasAndroidApk });
    setShowToast(true);
    window.setTimeout(() => {
      setShowToast(false);
    }, 2600);
  };

  return (
    <section className="animate-fade-up space-y-6">
      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="space-y-5">
          <article className="card card-hover p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo font-mono text-xl text-white">
                  {safePlayerData.displayName.charAt(0)}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-sora text-2xl font-bold text-ink">{safePlayerData.displayName}</h2>
                    <span className="rounded-full bg-indigo-pale px-2 py-1 text-xs font-medium text-indigo-light">
                      {rankTitle}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-indigo px-2 py-1 text-xs text-white">Rank #{ranking}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        safePlayerData.isAsleep ? 'bg-mint-pale text-mint' : 'bg-amber-pale text-amber'
                      }`}
                    >
                      {safePlayerData.isAsleep ? '😴 Sleeping' : '☀️ Awake right now'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="font-mono text-4xl font-medium text-indigo-light">{safeXp.toLocaleString()} XP</p>
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="card card-hover relative p-5">
              <span className="absolute right-3 top-3">⚡</span>
              <p className="font-mono text-3xl text-ink">{safeXp.toLocaleString()}</p>
              <p className="text-sm text-text-secondary">Total XP</p>
            </article>
            <article className="card card-hover relative p-5">
              <span className="absolute right-3 top-3">🔥</span>
              <p className="font-mono text-3xl text-ink">{safePlayerData.currentStreak}</p>
              <p className="text-sm text-text-secondary">Current Streak</p>
            </article>
            <article className="card card-hover relative p-5">
              <span className="absolute right-3 top-3">💎</span>
              <p className="font-mono text-3xl text-ink">{safePlayerData.credits}</p>
              <p className="text-sm text-text-secondary">Credits</p>
            </article>
            <article className="card card-hover relative p-5">
              <span className="absolute right-3 top-3">🏅</span>
              <p className="font-mono text-3xl text-ink">{safePlayerData.longestStreak}</p>
              <p className="text-sm text-text-secondary">Longest Streak</p>
            </article>
          </div>

          <article className="card card-hover p-5">
            <p className="font-sora text-lg font-semibold text-ink">XP Progress</p>
            <p className="mt-1 font-mono text-sm text-text-secondary">
              {safeXp.toLocaleString()} / {nextMilestone.toLocaleString()} XP to next rank
            </p>
            <div className="mt-3 h-2 rounded-full bg-mint-pale">
              <div
                className="h-full rounded-full bg-indigo transition-all duration-700"
                style={{ width: `${Math.max(4, Math.min(100, milestoneProgress))}%` }}
              />
            </div>
          </article>

          <article className="card card-hover p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-sora text-lg font-semibold text-ink">Wins Cabinet</p>
              <span className="rounded-full bg-indigo px-2 py-1 font-mono text-xs text-white">
                {winStats.total} wins
              </span>
            </div>
            <p className="mt-1 text-sm text-text-secondary">How many times you have won something.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {Object.entries(winStats.byLeague).length > 0 ? (
                Object.entries(winStats.byLeague).map(([league, count]) => (
                  <div key={league} className="rounded-xl border border-border bg-indigo-pale/50 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-indigo-light">{league}</p>
                    <p className="font-mono text-xl text-ink">{count}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-secondary">No wins yet — tonight is a great night to start.</p>
              )}
            </div>
          </article>
        </div>

        <article className="card card-hover h-fit p-6 xl:sticky xl:top-8">
          <h3 className="font-sora text-2xl font-semibold text-ink">Settings</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Personalize your sleep targets and region for league tracking.
          </p>
          <form className="mt-4 space-y-4" onSubmit={handleSave}>
            <label className="block text-sm text-ink">
              I want to sleep{' '}
              <input
                type="number"
                min="5"
                max="12"
                value={sleepTarget}
                onChange={(event) => setSleepTarget(event.target.value)}
                className="mx-2 w-20 rounded-xl border border-border bg-base px-3 py-2 font-mono text-ink outline-none focus:border-indigo"
              />
              hours per night
            </label>

            <label className="block text-sm text-ink">
              Continent
              <select
                value={continent}
                onChange={(event) => setContinent(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-border bg-base px-3 py-2 text-ink outline-none focus:border-indigo"
              >
                {continents.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center justify-between rounded-xl border border-border bg-base px-3 py-2 text-sm text-ink">
              <span>Has Android APK</span>
              <input
                type="checkbox"
                checked={hasAndroidApk}
                onChange={(event) => setHasAndroidApk(event.target.checked)}
                className="h-4 w-4 accent-indigo"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-full border border-border bg-indigo px-4 py-2 text-sm font-medium text-white transition hover:brightness-105"
            >
              Save Changes
            </button>
          </form>
        </article>
      </div>

      {showToast ? (
        <div className="card fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4 py-3 text-sm text-indigo">
          Settings saved successfully
        </div>
      ) : null}
    </section>
  );
}

export default ProfilePage;
