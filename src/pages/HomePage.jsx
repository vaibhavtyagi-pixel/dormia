import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { update, ref } from 'firebase/database';
import LeagueResultsPanel from '../components/league/LeagueResultsPanel.jsx';
import MockMap from '../components/map/MockMap.jsx';
import LastAwakeNotification from '../components/notifications/LastAwakeNotification.jsx';
import MockObituaryToast from '../components/notifications/MockObituaryToast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { db, rtdb } from '../firebase.js';
import { normalizeLeagueKey } from '../utils/leagueScopes.js';

function HomePage() {
  const location = useLocation();
  const {
    currentUser,
    playerData,
    players,
    settings,
    setCurrentUserSleepState,
    membershipByUid,
    currentLeagueId,
  } = useAuth();
  const [showLastAwake, setShowLastAwake] = useState(false);
  const [showObituaryToast, setShowObituaryToast] = useState(false);
  const [activeLeague, setActiveLeague] = useState('myLeague');
  const [leagueName, setLeagueName] = useState('No league yet');
  const [leagueCode, setLeagueCode] = useState('----');
  const [joinCode, setJoinCode] = useState('');
  const [leagueMessage, setLeagueMessage] = useState('');
  const [winnersData, setWinnersData] = useState([]);
  const [dailyRewardData, setDailyRewardData] = useState(null);
  const [activeQuest, setActiveQuest] = useState(null);
  const [sleepRewardMessage, setSleepRewardMessage] = useState('');

  const safePlayerData = playerData ?? {
    uid: currentUser?.uid ?? 'fallback',
    currentStreak: 0,
    longestStreak: 1,
    continent: 'Europe',
    isAsleep: false,
    displayName: currentUser?.displayName ?? 'Player',
  };
  const sourcePlayers = players ?? [];

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
    return [...winnersData]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8)
      .map((entry) => ({
        ...entry,
        winnerName: playerByUid.get(entry.winnerUid)?.displayName ?? 'Unknown player',
      }));
  }, [sourcePlayers, winnersData]);

  const filteredWinnersTimeline = useMemo(() => {
    return winnersTimeline.filter((entry) => normalizeLeagueKey(entry.league) === activeLeague);
  }, [winnersTimeline, activeLeague]);

  useEffect(() => {
    if (!db || !currentUser) return undefined;

    const membershipRef = doc(db, 'league_memberships', currentUser.uid);
    const unsubscribeMembership = onSnapshot(membershipRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setLeagueName('No league yet');
        setLeagueCode('----');
        return;
      }
      const membership = snapshot.data();
      const leagueSnap = await getDocs(
        query(collection(db, 'leagues'), where('leagueId', '==', membership.leagueId), limit(1))
      );
      if (leagueSnap.empty) {
        setLeagueName('Unknown league');
        setLeagueCode(membership.leagueId ?? '----');
        return;
      }
      const league = leagueSnap.docs[0].data();
      setLeagueName(league.name ?? 'Private League');
      setLeagueCode(league.inviteCode ?? '----');
    });

    const winnersUnsubscribe = onSnapshot(
      query(collection(db, 'league_results'), orderBy('date', 'desc'), limit(30)),
      (snapshot) => {
        if (snapshot.empty) {
          setWinnersData([]);
          return;
        }
        const rows = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
          league: item.data().leagueScope ?? item.data().league ?? 'World',
        }));
        setWinnersData(rows);
      },
      () => setWinnersData([])
    );

    const rewardUnsubscribe = onSnapshot(doc(db, 'daily_rewards', currentUser.uid), (snapshot) => {
      setDailyRewardData(snapshot.exists() ? snapshot.data() : null);
    });

    const questUnsubscribe = onSnapshot(collection(db, `quests/${currentUser.uid}/active`), (snapshot) => {
      if (snapshot.empty) {
        setActiveQuest(null);
        return;
      }
      const first = snapshot.docs[0];
      setActiveQuest({ id: first.id, ...first.data() });
    });

    return () => {
      unsubscribeMembership();
      winnersUnsubscribe();
      rewardUnsubscribe();
      questUnsubscribe();
    };
  }, [currentUser]);

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

  const mapPlayers = useMemo(
    () =>
      sourcePlayers.map((player) => ({
        uid: player.uid,
        displayName: player.displayName ?? 'Player',
        continent: player.continent ?? 'Europe',
        isAsleep: Boolean(player.isAsleep),
        lat: Number.isFinite(Number(player.lat)) ? Number(player.lat) : 40.4168,
        lng: Number.isFinite(Number(player.lng)) ? Number(player.lng) : -3.7038,
        currentStreak: Number(player.currentStreak) || 0,
      })),
    [sourcePlayers]
  );

  const handleCreateLeague = async () => {
    if (!currentUser) return;
    const newCode = `DOR-${Math.floor(1000 + Math.random() * 9000)}`;
    const leagueRef = doc(collection(db, 'leagues'));
    const newLeagueId = leagueRef.id;
    await setDoc(
      leagueRef,
      {
        leagueId: newLeagueId,
        name: `League ${newCode.slice(-4)}`,
        inviteCode: newCode,
        ownerUid: currentUser.uid,
        scope: 'private',
        isActive: true,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    await setDoc(
      doc(db, 'league_memberships', currentUser.uid),
      {
        uid: currentUser.uid,
        leagueId: newLeagueId,
        role: 'owner',
        joinedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await setDoc(
      doc(db, `leagues/${newLeagueId}/members`, currentUser.uid),
      {
        uid: currentUser.uid,
        joinedAt: serverTimestamp(),
      },
      { merge: true }
    );
    setLeagueCode(newCode);
    setLeagueName(`League ${newCode.slice(-4)}`);
    setLeagueMessage(`League created in Firebase. Share code ${newCode} to invite others.`);
    setActiveLeague('myLeague');
  };

  const handleJoinLeague = async () => {
    if (!currentUser) return;
    const normalized = joinCode.trim().toUpperCase();
    if (!normalized) {
      setLeagueMessage('Please enter a valid league code.');
      return;
    }
    const leaguesSnap = await getDocs(query(collection(db, 'leagues'), where('inviteCode', '==', normalized), limit(1)));
    if (leaguesSnap.empty) {
      setLeagueMessage(`Code ${normalized} not found.`);
      return;
    }
    const leagueDoc = leaguesSnap.docs[0];
    const league = leagueDoc.data();
    await setDoc(
      doc(db, 'league_memberships', currentUser.uid),
      {
        uid: currentUser.uid,
        leagueId: league.leagueId ?? leagueDoc.id,
        role: 'member',
        joinedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await setDoc(
      doc(db, `leagues/${league.leagueId ?? leagueDoc.id}/members`, currentUser.uid),
      {
        uid: currentUser.uid,
        joinedAt: serverTimestamp(),
      },
      { merge: true }
    );
    setLeagueCode(normalized);
    setLeagueName(league.name ?? `Joined ${normalized}`);
    setLeagueMessage(`You joined ${league.name ?? normalized} from Firebase.`);
    setActiveLeague('myLeague');
    setJoinCode('');
  };

  const activeLeagueLabel =
    activeLeague === 'myLeague'
      ? `${leagueName} (${leagueCode})`
      : activeLeague.charAt(0).toUpperCase() + activeLeague.slice(1);
  const currentLeagueMemberCount = currentLeagueId
    ? Object.values(membershipByUid).filter((membership) => membership.leagueId === currentLeagueId).length
    : 1;
  const myLeagueWins = winnersTimeline.filter(
    (entry) => entry.winnerUid === safePlayerData.uid && normalizeLeagueKey(entry.league) === 'myLeague'
  ).length;

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
      const toDate = (value) => {
        if (!value) return null;
        if (value instanceof Date) return value;
        if (typeof value?.toDate === 'function') return value.toDate();
        if (typeof value === 'string' || typeof value === 'number') return new Date(value);
        return null;
      };
      const now = new Date();
      const lastSleepStart = toDate(safePlayerData.lastSleepStart);
      const sleptHours =
        lastSleepStart && Number.isFinite(lastSleepStart.getTime())
          ? Math.max(0, (now.getTime() - lastSleepStart.getTime()) / (1000 * 60 * 60))
          : settings.sleepTarget;
      const targetHours = Math.max(5, Number(settings.sleepTarget) || 7);
      const delta = sleptHours - targetHours;
      const deviation = Math.abs(delta);

      const baseXp = 25;
      const qualityBonus = Math.max(0, Math.round(90 - deviation * 30));
      const heavyPenalty = deviation >= 2.5 ? 35 : deviation >= 1.5 ? 15 : 0;
      const earnedXp = Math.max(8, baseXp + qualityBonus - heavyPenalty);
      const earnedCredits = Math.max(2, Math.round(earnedXp / 8));
      const hitBand = deviation <= 1.25;
      const streakDelta = hitBand ? 1 : safePlayerData.currentStreak > 0 ? -1 : 0;
      const nextStreak = Math.max(0, safePlayerData.currentStreak + streakDelta);

      await updateDoc(doc(db, 'players', currentUser.uid), {
        isAsleep: false,
        lastSleepEnd: serverTimestamp(),
        lastSleepDurationMinutes: Math.max(0, Math.round(sleptHours * 60)),
        lastSleepRewardXp: earnedXp,
        lastSleepRewardCredits: earnedCredits,
        lastSleepHitTarget: hitBand,
        xp: increment(earnedXp),
        credits: increment(earnedCredits),
        currentStreak: nextStreak,
        longestStreak: Math.max(safePlayerData.longestStreak ?? 0, nextStreak),
      });
      await update(ref(rtdb, `dormia/players/${currentUser.uid}`), { isAsleep: false });

      await addDoc(collection(db, 'sleep_sessions'), {
        uid: currentUser.uid,
        sleptHours: Number(sleptHours.toFixed(2)),
        targetHours,
        deviation: Number(deviation.toFixed(2)),
        hitTarget: hitBand,
        xpEarned: earnedXp,
        creditsEarned: earnedCredits,
        createdAt: serverTimestamp(),
      });

      const dailyRewardRef = doc(db, 'daily_rewards', currentUser.uid);
      const dailyRewardSnap = await getDoc(dailyRewardRef);
      const todayKey = now.toISOString().slice(0, 10);
      const previous = dailyRewardSnap.exists() ? dailyRewardSnap.data() : {};
      const previousKey = previous?.lastClaimDate ?? null;
      let nextStreakDay = Number(previous?.streakDay) || 0;
      let nextTotalClaims = Number(previous?.totalClaims) || 0;
      if (previousKey !== todayKey) {
        nextStreakDay += 1;
        nextTotalClaims += 1;
      }

      await setDoc(
        dailyRewardRef,
        {
          uid: currentUser.uid,
          streakDay: nextStreakDay,
          totalClaims: nextTotalClaims,
          lastClaimDate: todayKey,
          lastRewardXp: earnedXp,
          lastRewardCredits: earnedCredits,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const activeQuestQuery = query(collection(db, `quests/${currentUser.uid}/active`), limit(1));
      const activeQuestSnap = await getDocs(activeQuestQuery);
      if (!activeQuestSnap.empty) {
        const activeQuestDoc = activeQuestSnap.docs[0];
        const activeQuest = activeQuestDoc.data();
        const currentProgress = Number(activeQuest?.progress) || 0;
        const goal = Number(activeQuest?.goal) || 0;
        const nextProgress = currentProgress + 1;
        await updateDoc(activeQuestDoc.ref, {
          progress: increment(1),
          status: goal > 0 && nextProgress >= goal ? 'completed' : activeQuest?.status ?? 'active',
          completedAt: goal > 0 && nextProgress >= goal ? serverTimestamp() : activeQuest?.completedAt ?? null,
          updatedAt: serverTimestamp(),
        });
      }

      const deltaLabel = delta >= 0 ? `+${delta.toFixed(1)}h` : `${delta.toFixed(1)}h`;
      setSleepRewardMessage(
        `+${earnedXp} XP, +${earnedCredits} coins (${sleptHours.toFixed(1)}h vs target ${targetHours}h, ${deltaLabel}).`
      );
      window.setTimeout(() => setSleepRewardMessage(''), 4200);
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
          <span className="rounded-full border border-border bg-card px-2 py-1">
            Members in my league: <span className="font-mono text-ink">{currentLeagueMemberCount}</span>
          </span>
        </div>
      </section>

      <div className="mt-6">
        <LeagueResultsPanel
          players={sourcePlayers}
          currentUser={safePlayerData}
          activeLeague={activeLeague}
          onLeagueChange={setActiveLeague}
          membershipByUid={membershipByUid}
          winners={winnersData}
        />
      </div>

      <section className="card card-hover mt-6 grid gap-3 p-5 md:grid-cols-3">
        <article className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-text-secondary">My wins</p>
          <p className="mt-1 font-mono text-3xl text-ink">{myLeagueWins}</p>
          <p className="text-xs text-text-secondary">wins in my league</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-text-secondary">Daily reward</p>
          <p className="mt-1 font-mono text-3xl text-ink">{dailyRewardData?.streakDay ?? 0}</p>
          <p className="text-xs text-text-secondary">current reward cycle day</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-text-secondary">Active quest</p>
          <p className="mt-1 text-sm font-semibold text-ink">{activeQuest?.title ?? 'No active quest yet'}</p>
          <p className="text-xs text-text-secondary">
            {activeQuest ? `${activeQuest.progress ?? 0}/${activeQuest.goal ?? 0} progress` : 'Create one from Firebase to start.'}
          </p>
        </article>
      </section>

      <section className="card card-hover mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-sora text-xl font-bold text-ink">Sleep Tracking (Real Firebase)</h3>
          <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-text-secondary">
            Latest from each user profile
          </span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-text-secondary">
                <th className="px-3 py-1">User</th>
                <th className="px-3 py-1">Last Sleep</th>
                <th className="px-3 py-1">Duration</th>
                <th className="px-3 py-1">Last Reward</th>
                <th className="px-3 py-1">XP Total</th>
                <th className="px-3 py-1">Credits</th>
              </tr>
            </thead>
            <tbody>
              {sourcePlayers.length > 0 ? (
                [...sourcePlayers]
                  .sort((a, b) => {
                    const aTime =
                      typeof a?.lastSleepEnd?.toDate === 'function'
                        ? a.lastSleepEnd.toDate().getTime()
                        : 0;
                    const bTime =
                      typeof b?.lastSleepEnd?.toDate === 'function'
                        ? b.lastSleepEnd.toDate().getTime()
                        : 0;
                    return bTime - aTime;
                  })
                  .map((player) => {
                    const lastSleepEnd =
                      typeof player?.lastSleepEnd?.toDate === 'function'
                        ? player.lastSleepEnd.toDate()
                        : null;
                    const lastSleepStart =
                      typeof player?.lastSleepStart?.toDate === 'function'
                        ? player.lastSleepStart.toDate()
                        : null;
                    const fallbackMinutes =
                      lastSleepStart && lastSleepEnd
                        ? Math.max(
                            0,
                            Math.round((lastSleepEnd.getTime() - lastSleepStart.getTime()) / (1000 * 60))
                          )
                        : 0;
                    const minutes = Number(player?.lastSleepDurationMinutes) || fallbackMinutes;
                    const lastRewardXp = Number(player?.lastSleepRewardXp) || 0;
                    const lastRewardCredits = Number(player?.lastSleepRewardCredits) || 0;
                    const isYou = player.uid === safePlayerData.uid;

                    return (
                      <tr key={player.uid} className={`rounded-xl border ${isYou ? 'border-indigo bg-indigo-pale/40' : 'border-border bg-card'}`}>
                        <td className="rounded-l-xl border-y border-l border-border px-3 py-2 text-sm text-ink">
                          {player.displayName}
                          {isYou ? <span className="ml-2 rounded-full bg-indigo px-2 py-0.5 text-[11px] font-semibold text-white">you</span> : null}
                        </td>
                        <td className="border-y border-border px-3 py-2 text-sm text-text-secondary">
                          {lastSleepEnd
                            ? lastSleepEnd.toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'No sleep record yet'}
                        </td>
                        <td className="border-y border-border px-3 py-2 text-sm text-ink">
                          {minutes > 0 ? `${minutes} min` : '—'}
                        </td>
                        <td className="border-y border-border px-3 py-2 text-sm text-ink">
                          {lastRewardXp > 0 || lastRewardCredits > 0
                            ? `+${lastRewardXp} XP · +${lastRewardCredits} coins`
                            : '—'}
                        </td>
                        <td className="border-y border-border px-3 py-2 font-mono text-sm text-indigo">
                          {(Number(player.xp) || 0).toLocaleString()}
                        </td>
                        <td className="rounded-r-xl border-y border-r border-border px-3 py-2 font-mono text-sm text-ink">
                          {(Number(player.credits) || 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan={6} className="rounded-xl border border-border bg-card px-4 py-4 text-sm text-text-secondary">
                    No players loaded from Firebase yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

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

      <div className="relative mt-6 min-h-[55vh] md:min-h-[72vh]">
        <MockMap players={mapPlayers} className="h-[55vh] min-h-[340px] w-full md:h-[72vh] md:min-h-[520px]" />
      </div>

      {isDevMode ? (
        <div className="card fixed bottom-4 left-4 right-4 z-50 w-auto border-indigo/20 bg-card p-4 md:bottom-6 md:left-auto md:right-4 md:w-80">
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
      {sleepRewardMessage ? (
        <div className="card fixed bottom-4 left-4 right-4 z-50 px-4 py-3 text-sm text-indigo md:bottom-6 md:left-1/2 md:right-auto md:max-w-[80vw] md:-translate-x-1/2">
          {sleepRewardMessage}
        </div>
      ) : null}
    </section>
  );
}

export default HomePage;
