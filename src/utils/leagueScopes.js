export const leagueConfigs = [
  { key: 'myLeague', label: 'My League', description: 'Private league by invite code' },
  { key: 'city', label: 'City', description: 'Your city leaderboard' },
  { key: 'country', label: 'Country', description: 'Your country leaderboard' },
  { key: 'continent', label: 'Continent', description: 'Regional competition' },
  { key: 'world', label: 'World', description: 'Global ranking' },
];

export function getLeaguePlayers(key, players, currentUser, membershipByUid = {}) {
  if (!currentUser) return players;
  if (key === 'myLeague') {
    const currentLeagueId = membershipByUid[currentUser.uid]?.leagueId;
    if (!currentLeagueId) return [currentUser, ...players.filter((player) => player.uid !== currentUser.uid)];
    return players.filter((player) => membershipByUid[player.uid]?.leagueId === currentLeagueId);
  }
  if (key === 'city') return players.filter((player) => player.city === currentUser.city);
  if (key === 'country') return players.filter((player) => player.country === currentUser.country);
  if (key === 'continent') return players.filter((player) => player.continent === currentUser.continent);
  return players;
}

export function normalizeLeagueKey(value) {
  if (!value) return 'world';
  const normalized = String(value).toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized === 'myleague' || normalized === 'private') return 'myLeague';
  if (normalized.includes('city')) return 'city';
  if (normalized.includes('country')) return 'country';
  if (normalized.includes('continent')) return 'continent';
  return 'world';
}

