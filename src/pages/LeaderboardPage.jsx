import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../firebase.js';
import { mockPlayers } from '../mockData.js';
import { getLeaguePlayers, leagueConfigs } from '../utils/leagueScopes.js';

const continentEmoji = {
  Europe: '🇪🇺',
  Americas: '🌎',
  Asia: '🌏',
  Africa: '🌍',
  Oceania: '🌊',
};

const avatarThemes = [{ bg: 'bg-indigo-pale' }, { bg: 'bg-mint-pale' }, { bg: 'bg-amber-pale' }];

function LeaderboardPage() {
  const { currentUser, players, membershipByUid } = useAuth();
  const [activeLeague, setActiveLeague] = useState('world');
  const [livePlayers, setLivePlayers] = useState([]);

  useEffect(() => {
    const leaderboardQuery = query(collection(db, 'players'), orderBy('xp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(
      leaderboardQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setLivePlayers([]);
          return;
        }
        setLivePlayers(
          snapshot.docs.map((item) => ({
            uid: item.id,
            city: 'Unknown',
            country: 'Unknown',
            ...item.data(),
          }))
        );
      },
      () => {
        setLivePlayers([]);
      }
    );

    return () => unsubscribe();
  }, []);

  const sourcePlayers = livePlayers.length > 0 ? livePlayers : players?.length > 0 ? players : mockPlayers;

  const leaderboard = useMemo(
    () =>
      [...getLeaguePlayers(activeLeague, sourcePlayers, currentUser ?? mockPlayers[1], membershipByUid)].sort((a, b) => {
        if (b.xp !== a.xp) return b.xp - a.xp;
        if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
        return b.longestStreak - a.longestStreak;
      }),
    [sourcePlayers, activeLeague, currentUser, membershipByUid]
  );

  return (
    <section className="animate-fade-up">
      <div className="mb-4 overflow-hidden rounded-xl bg-indigo py-2 text-white">
        <div className="ticker-track px-4 text-[13px]">
          <span>🏆 Marta L. hit a 14-day streak</span>
          <span>😴 Yuki T. is sleeping</span>
          <span>⚡ James K. earned 150 XP</span>
          <span>🌍 6 players tracked tonight</span>
          <span>🏆 Marta L. hit a 14-day streak</span>
          <span>😴 Yuki T. is sleeping</span>
          <span>⚡ James K. earned 150 XP</span>
          <span>🌍 6 players tracked tonight</span>
        </div>
      </div>

      <h2 className="font-sora text-4xl font-extrabold tracking-tight text-indigo">LEADERBOARD</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {leagueConfigs.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setActiveLeague(filter.key)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              activeLeague === filter.key
                ? 'border-indigo bg-indigo text-white'
                : 'border-border bg-card text-text-secondary hover:bg-indigo-pale/70 hover:text-ink'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {leaderboard.map((player, index) => {
          const rank = index + 1;
          const isCurrentUser = player.uid === currentUser?.uid;
          const avatarTheme = avatarThemes[index % avatarThemes.length];
          const streakRatio = player.longestStreak > 0 ? (player.currentStreak / player.longestStreak) * 100 : 0;
          const podiumBorder =
            rank === 1
              ? 'border-[rgba(251,191,36,0.5)] bg-indigo-pale/45'
              : rank === 2
                ? 'border-[rgba(156,163,175,0.4)]'
                : rank === 3
                  ? 'border-[rgba(180,120,60,0.3)]'
                  : 'border-border';

          return (
            <article
              key={player.uid}
              className={`animate-fade-up card card-hover border ${podiumBorder} px-4 py-3 ${
                isCurrentUser ? 'border-l-[3px] border-l-indigo bg-indigo-pale' : 'bg-card'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="grid items-center gap-3 md:grid-cols-[70px_1.2fr_130px_150px_140px_100px]">
                <p className="font-mono text-xl text-ink">{rank === 1 ? `👑 ${rank}` : rank}</p>

                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full ${avatarTheme.bg}`} />
                  <div>
                    <p className="text-2xl font-semibold leading-tight text-ink">{player.displayName}</p>
                    <p className="text-[36px] leading-none">{continentEmoji[player.continent] || '🌍'}</p>
                  </div>
                </div>

                <div>
                  <p className="font-mono text-xl text-indigo">{(Number(player.xp) || 0).toLocaleString()}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-indigo-light">XP</p>
                </div>

                <div>
                  <p className="font-mono text-base text-ink">
                    {player.currentStreak}
                    {player.currentStreak >= 7 ? ' 🔥🔥' : ''}
                  </p>
                  <div className="mt-1 h-[3px] w-20 rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-indigo" style={{ width: `${Math.max(4, Math.min(100, streakRatio))}%` }} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${player.isAsleep ? 'bg-mint' : 'bg-amber animate-flicker-awake'}`} />
                  <span className="text-sm text-text-secondary">{player.isAsleep ? 'Sleeping' : 'Awake'}</span>
                </div>

                <p className="text-sm text-text-secondary">
                  {player.currentStreak}/{player.longestStreak}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default LeaderboardPage;
