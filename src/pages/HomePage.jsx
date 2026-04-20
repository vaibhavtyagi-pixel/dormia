import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { onValue, ref, update } from 'firebase/database';
import LeagueResultsPanel from '../components/league/LeagueResultsPanel.jsx';
import MockMap from '../components/map/MockMap.jsx';
import LastAwakeNotification from '../components/notifications/LastAwakeNotification.jsx';
import MockObituaryToast from '../components/notifications/MockObituaryToast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { mockWinners } from '../mockWinners.js';
import { db, rtdb } from '../firebase.js';
import { mockPlayers } from '../mockData.js';

function HomePage() {
  const location = useLocation();
  const { currentUser, playerData, players, settings, setCurrentUserSleepState } = useAuth();
  const [showLastAwake, setShowLastAwake] = useState(false);
  const [showObituaryToast, setShowObituaryToast] = useState(false);
  const [activeLeague, setActiveLeague] = useState('myLeague');
  const [leagueName, setLeagueName] = useState('Night Owls');
  const [leagueCode, setLeagueCode] = useState('DOR-8291');
  const [joinCode, setJoinCode] = useState('');
  const [leagueMessage, setLeagueMessage] = useState('');
  const [mapPlayers, setMapPlayers] = useState([]);

  const safePlayerData = playerData ?? {
    uid: currentUser?.uid ?? 'fallback',
    currentStreak: 0,
    longestStreak: 1,
    continent: 'Europe',
    isAsleep: false,
    displayName: currentUser?.displayName ?? 'Player',
  };
  const sourcePlayers = players?.length ? players : mockPlayers;

  const isDevMode = useMemo(() => new URLSearchParams(location.search).get('dev') === 'true', [location.search]);
  const awakeCount = sourcePlayers.filter((player) => !player.isAsleep).length;
  const sleepingCount = sourcePlayers.filter((player) => player.isAsleep).length;
  const streakProgress =
    safePlayerData.longestStreak > 0
      ? (safePlayerData.currentStreak / safePlayerData.longestStreak) * 100
      : 0;
  const [animatedAwake, setAnimatedAwake] = useState(0);
  const [animatedSleeping, setAnimatedSleeping] = useState(0);
  const [animatedStreak, setAnimatedStreak] = useState(0);

  const winnersTimeline = useMemo(() => {
    const playerByUid = new Map(sourcePlayers.map((player) => [player.uid, player]));
    return [...mockWinners]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8)
      .map((entry) => ({
        ...entry,
        winnerName: playerByUid.get(entry.winnerUid)?.displayName ?? 'Unknown player',
      }));
  }, [sourcePlayers]);

  const filteredWinnersTimeline = useMemo(() => {
    const mapLeagueName = (value) => value.toLowerCase().replace(/\s+/g, '');
    const selected = activeLeague === 'myLeague' ? 'myleague' : activeLeague.toLowerCase();
    return winnersTimeline.filter((entry) => mapLeagueName(entry.league) === selected);
  }, [winnersTimeline, activeLeague]);

  useEffect(() => {
    const duration = 800;
    const start = performance.now();
    let frameId;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setAnimatedAwake(Math.round(awakeCount * progress));
      setAnimatedSleeping(Math.round(sleepingCount * progress));
      setAnimatedStreak(Math.round(safePlayerData.currentStreak * progress));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [awakeCount, sleepingCount, safePlayerData.currentStreak]);

  useEffect(() => {
    const playersRef = ref(rtdb, 'dormia/players');
    const unsubscribe = onValue(
      playersRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setMapPlayers([]);
          return;
        }
        const value = snapshot.val();
        const next = Object.entries(value).map(([uid, item]) => ({
          uid,
          displayName: item.displayName ?? 'Player',
          continent: item.continent ?? 'Europe',
          isAsleep: item.isAsleep ?? false,
          lat: item.lat ?? 40.4168,
          lng: item.lng ?? -3.7038,
          currentStreak:
            sourcePlayers.find((player) => player.uid === uid)?.currentStreak ?? 0,
        }));
        setMapPlayers(next);
      },
      () => setMapPlayers([])
    );

    return () => unsubscribe();
  }, [sourcePlayers]);

  const handleCreateLeague = () => {
    const newCode = `DOR-${Math.floor(1000 + Math.random() * 9000)}`;
    setLeagueCode(newCode);
    setLeagueName(`League ${newCode.slice(-4)}`);
    setLeagueMessage(`League created. Share code ${newCode} to invite others.`);
    setActiveLeague('myLeague');
  };

  const handleJoinLeague = () => {
    const normalized = joinCode.trim().toUpperCase();
    if (!normalized) {
      setLeagueMessage('Please enter a valid league code.');
      return;
    }
    setLeagueCode(normalized);
    setLeagueName(`Joined ${normalized}`);
    setLeagueMessage(`You joined league ${normalized}.`);
    setActiveLeague('myLeague');
    setJoinCode('');
  };

  const activeLeagueLabel =
    activeLeague === 'myLeague'
      ? `${leagueName} (${leagueCode})`
      : activeLeague.charAt(0).toUpperCase() + activeLeague.slice(1);

  const handleSleep = async () => {
    const awakeInContinent = sourcePlayers.filter(
      (player) => player.continent === safePlayerData.continent && !player.isAsleep
    );
    const isLastAwake =
      awakeInContinent.length === 1 && awakeInContinent[0].uid === safePlayerData.uid;

    await setCurrentUserSleepState(true);
    if (currentUser?.uid) {
      await updateDoc(doc(db, 'players', currentUser.uid), {
        isAsleep: true,
        lastSleepStart: serverTimestamp(),
      });
      await update(ref(rtdb, `dormia/players/${currentUser.uid}`), { isAsleep: true });
    }

    if (isLastAwake) {
      setShowLastAwake(true);
    }
  };

  const handleWakeUp = async () => {
    await setCurrentUserSleepState(false);
    if (currentUser?.uid) {
      await updateDoc(doc(db, 'players', currentUser.uid), {
        isAsleep: false,
        lastSleepEnd: serverTimestamp(),
      });
      await update(ref(rtdb, `dormia/players/${currentUser.uid}`), { isAsleep: false });
    }

    if (Math.random() < 0.3 && settings.sleepTarget > 0) {
      setShowObituaryToast(true);
      window.setTimeout(() => {
        setShowObituaryToast(false);
      }, 5000);
    }
  };

  return (
    <section className="relative animate-fade-up">
      <p className="mb-3 text-xs uppercase tracking-[0.18em] text-indigo-light">Tonight's Pulse</p>
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <article className="card card-hover p-5">
          <div className="flex items-center gap-2">
            <p className="count-up-pop font-mono text-5xl font-medium text-ink">{animatedAwake}</p>
            <span className="h-3 w-3 rounded-full bg-amber animate-flicker-awake" />
          </div>
          <p className="mt-2 text-sm text-text-secondary">people still up right now</p>
          <p className="mt-1 font-sora text-lg font-semibold text-ink">Still Awake</p>
        </article>

        <article className="card card-hover p-5">
          <div className="flex items-center gap-2">
            <p className="count-up-pop font-mono text-5xl font-medium text-ink">{animatedSleeping}</p>
            <span className="h-3 w-3 rounded-full bg-mint" />
          </div>
          <p className="mt-2 text-sm text-text-secondary">currently earning XP</p>
          <p className="mt-1 font-sora text-lg font-semibold text-ink">Sleeping</p>
        </article>

        <article className="card card-hover p-5">
          <div className="flex items-center gap-2">
            <p className="count-up-pop font-mono text-5xl font-medium text-ink">{animatedStreak}</p>
            {safePlayerData.currentStreak >= 7 ? <span className="text-3xl">🔥</span> : null}
          </div>
          <p className="mt-2 text-sm text-text-secondary">day streak</p>
          <p className="mt-1 font-sora text-lg font-semibold text-ink">Your Streak</p>
          <div className="mt-3 h-1.5 rounded-full bg-indigo-pale">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo to-mint transition-all duration-500"
              style={{ width: `${Math.max(3, Math.min(100, streakProgress))}%` }}
            />
          </div>
        </article>
      </div>

      <section className="card card-hover mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-sora text-xl font-bold text-ink">My League Access</h3>
            <p className="text-sm text-text-secondary">
              Create a private league or join one using a shared code.
            </p>
          </div>
          <span className="rounded-full bg-indigo px-3 py-1 text-xs font-semibold text-white">
            Active: {leagueName}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            type="text"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="Enter league code (e.g. DOR-8291)"
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink outline-none focus:border-indigo"
          />
          <button
            type="button"
            onClick={handleJoinLeague}
            className="rounded-full border border-border bg-indigo px-4 py-2 text-sm font-semibold text-white"
          >
            Join with code
          </button>
          <button
            type="button"
            onClick={handleCreateLeague}
            className="rounded-full border border-border bg-mint px-4 py-2 text-sm font-semibold text-[#09231a]"
          >
            Create league
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
          <span className="rounded-full border border-border bg-indigo-pale px-2 py-1">
            Your code: <span className="font-mono text-ink">{leagueCode}</span>
          </span>
          {leagueMessage ? <span>{leagueMessage}</span> : null}
        </div>
      </section>

      <div className="mt-6">
        <LeagueResultsPanel
          players={sourcePlayers}
          currentUser={safePlayerData}
          activeLeague={activeLeague}
          onLeagueChange={setActiveLeague}
        />
      </div>

      <section className="card card-hover mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-sora text-xl font-bold text-ink">Winners History</h3>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-pale px-3 py-1 text-xs text-indigo-light">Latest results</span>
            <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-ink">
              Showing: {activeLeagueLabel}
            </span>
          </div>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Who won, which day, in {activeLeagueLabel}. Only one league shown at a time.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-text-secondary">
                <th className="px-3 py-1">Day</th>
                <th className="px-3 py-1">League</th>
                <th className="px-3 py-1">Winner</th>
                <th className="px-3 py-1">Result</th>
              </tr>
            </thead>
            <tbody>
              {filteredWinnersTimeline.length > 0 ? (
                filteredWinnersTimeline.map((entry) => {
                  const isYou = entry.winnerUid === safePlayerData.uid;
                  return (
                    <tr
                      key={entry.id}
                      className={`rounded-xl border ${
                        isYou ? 'border-amber/60 bg-amber/10' : 'border-border bg-card'
                      }`}
                    >
                      <td className="rounded-l-xl border-y border-l border-border px-3 py-2 font-mono text-sm text-ink">
                        {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="border-y border-border px-3 py-2 text-sm text-ink">{entry.league}</td>
                      <td className="border-y border-border px-3 py-2 text-sm text-ink">
                        {entry.winnerName}
                        {isYou ? (
                          <span className="ml-2 rounded-full bg-amber px-2 py-0.5 text-[11px] font-semibold text-[#2b2314]">
                            🏆 YOU WON
                          </span>
                        ) : null}
                      </td>
                      <td className="rounded-r-xl border-y border-r border-border px-3 py-2 text-sm text-text-secondary">
                        {isYou ? 'Huge night — winner highlight unlocked!' : 'Won by rank & streak'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="rounded-xl border border-border bg-card px-4 py-4 text-sm text-text-secondary"
                  >
                    No winner records yet for this league. Start competing and claim the first crown.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="relative mt-6 min-h-[72vh]">
        <MockMap players={mapPlayers.length > 0 ? mapPlayers : mockPlayers} className="h-[72vh] min-h-[520px] w-full" />
      </div>

      {isDevMode ? (
        <div className="card fixed bottom-6 right-4 z-50 w-80 border-indigo/20 bg-card p-4">
          <p className="inline-block rounded-full bg-indigo-pale px-2 py-1 text-[10px] font-medium tracking-[0.18em] text-indigo">
            DEV MODE
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSleep}
              className="h-12 flex-1 rounded-full border border-border bg-indigo px-3 py-2 font-sora text-base font-semibold text-white"
            >
              😴 Sleep
            </button>
            <button
              type="button"
              onClick={handleWakeUp}
              className="h-12 flex-1 rounded-full border border-border bg-mint px-3 py-2 font-sora text-base font-semibold text-ink"
            >
              ☀️ Wake
            </button>
          </div>
          <p className="mt-3 text-sm text-text-secondary">
            You are currently: <span className="font-medium text-ink">{safePlayerData.isAsleep ? 'Asleep' : 'Awake'}</span>
          </p>
        </div>
      ) : null}

      <LastAwakeNotification
        show={showLastAwake}
        continent={safePlayerData.continent}
        onDismiss={() => setShowLastAwake(false)}
      />
      <MockObituaryToast show={showObituaryToast} displayName={safePlayerData.displayName} />
    </section>
  );
}

export default HomePage;
