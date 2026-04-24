import { useMemo, useState } from 'react';
import { getLeaguePlayers, leagueConfigs, normalizeLeagueKey } from '../../utils/leagueScopes.js';

function sortPlayers(players) {
  return [...players].sort((a, b) => {
    const xpA = Number(a.xp) || 0;
    const xpB = Number(b.xp) || 0;
    const streakA = Number(a.currentStreak) || 0;
    const streakB = Number(b.currentStreak) || 0;
    const longestA = Number(a.longestStreak) || 0;
    const longestB = Number(b.longestStreak) || 0;
    if (xpB !== xpA) return xpB - xpA;
    if (streakB !== streakA) return streakB - streakA;
    return longestB - longestA;
  });
}

function LeagueResultsPanel({
  players,
  currentUser,
  activeLeague: activeLeagueProp,
  onLeagueChange,
  membershipByUid = {},
  winners = [],
}) {
  const [internalLeague, setInternalLeague] = useState('myLeague');
  const activeLeague = activeLeagueProp ?? internalLeague;
  const setActiveLeague = onLeagueChange ?? setInternalLeague;

  const standings = useMemo(() => {
    const filtered = getLeaguePlayers(activeLeague, players, currentUser, membershipByUid);
    return sortPlayers(filtered).slice(0, 3);
  }, [activeLeague, players, currentUser, membershipByUid]);
  const latestWinnerDate = useMemo(
    () =>
      [...winners]
        .map((entry) => entry.date)
        .sort((a, b) => new Date(b) - new Date(a))[0],
    [winners]
  );
  const winnersByUid = useMemo(
    () =>
      winners.reduce((accumulator, entry) => {
        if (normalizeLeagueKey(entry.league) !== activeLeague) return accumulator;
        accumulator[entry.winnerUid] = (accumulator[entry.winnerUid] ?? 0) + 1;
        return accumulator;
      }, {}),
    [winners, activeLeague]
  );
  const todayLeagueWinners = useMemo(
    () =>
      new Set(
        winners
          .filter(
            (entry) => entry.date === latestWinnerDate && normalizeLeagueKey(entry.league) === activeLeague
          )
          .map((entry) => entry.winnerUid)
      ),
    [latestWinnerDate, winners, activeLeague]
  );

  return (
    <section className="card card-hover p-5">
      <div className="flex flex-wrap gap-2">
        {leagueConfigs.map((league) => (
          <button
            key={league.key}
            type="button"
            onClick={() => setActiveLeague(league.key)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              activeLeague === league.key
                ? 'border-border bg-indigo-pale font-medium text-indigo'
                : 'border-border bg-card text-text-secondary hover:bg-indigo-pale/40'
            }`}
          >
            {league.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <h3 className="font-sora text-xl font-bold text-ink">
          {leagueConfigs.find((item) => item.key === activeLeague)?.label} Podium
        </h3>
        <p className="text-sm text-text-secondary">
          Top 3 players in this league right now.
        </p>
      </div>

      <div className="mt-5 grid items-end gap-3 md:grid-cols-3">
        {[standings[1], standings[0], standings[2]].map((player, index) => {
          if (!player) return null;
          const visualRank = index === 1 ? 1 : index === 0 ? 2 : 3;
          const isCurrentUser = player.uid === currentUser.uid;
          const totalWins = winnersByUid[player.uid] ?? 0;
          const isTodayWinner = todayLeagueWinners.has(player.uid);
          const baseHeight =
            visualRank === 1
              ? 'md:min-h-[220px]'
              : visualRank === 2
                ? 'md:min-h-[190px]'
                : 'md:min-h-[176px]';
          const trophy = visualRank === 1 ? '🥇' : visualRank === 2 ? '🥈' : '🥉';
          return (
            <article
              key={player.uid}
              className={`relative rounded-2xl border px-4 pb-4 pt-3 ${baseHeight} ${
                isCurrentUser ? 'bg-indigo-pale border-indigo' : 'bg-card border-border'
              } ${isTodayWinner ? 'shadow-[0_0_0_1px_rgba(246,196,83,0.6),0_12px_38px_rgba(246,196,83,0.18)]' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm">
                    {trophy} <span className="font-mono text-xs text-text-secondary">#{visualRank}</span>
                  </p>
                  <p className={`mt-1 text-base ${isCurrentUser ? 'font-semibold text-indigo' : 'font-medium text-ink'}`}>
                    {player.displayName}
                    {isCurrentUser ? '  ← you' : ''}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {player.city}, {player.country}
                  </p>
                </div>
                <span
                  className={`mt-1 h-2.5 w-2.5 rounded-full ${
                    player.isAsleep ? 'bg-mint' : 'bg-amber animate-flicker-awake'
                  }`}
                />
              </div>

              <div className="mt-4">
                <p className="font-mono text-4xl text-ink">{(Number(player.xp) || 0).toLocaleString()}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-indigo-light">XP</p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {isTodayWinner ? (
                  <span className="rounded-full bg-amber px-2 py-0.5 text-[10px] font-semibold text-[#2b2314]">
                    ⚡ WON TODAY
                  </span>
                ) : null}
                {totalWins > 0 ? (
                  <span className="rounded-full bg-indigo px-2 py-0.5 text-[10px] font-semibold text-white">
                    🏆 {totalWins} wins
                  </span>
                ) : (
                  <span className="rounded-full bg-indigo-pale px-2 py-0.5 text-[10px] text-indigo-light">
                    first win pending
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl border border-border bg-indigo-pale/50 px-3 py-2 text-xs text-indigo-light">
        <span className="font-semibold text-ink">Excitement mode:</span> winners glow, today champions get lightning badges, and each podium card shows lifetime wins.
      </div>
    </section>
  );
}

export default LeagueResultsPanel;
