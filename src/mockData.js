export const mockPlayers = [
  { uid: '1', displayName: 'Marta L.', xp: 2400, credits: 180, currentStreak: 14, longestStreak: 21, isAsleep: true, continent: 'Europe', country: 'Spain', city: 'Madrid', lat: 40.41, lng: -3.7 },
  { uid: '2', displayName: 'James K.', xp: 1950, credits: 120, currentStreak: 7, longestStreak: 12, isAsleep: false, continent: 'Americas', country: 'USA', city: 'New York', lat: 40.71, lng: -74.0 },
  { uid: '3', displayName: 'Yuki T.', xp: 1700, credits: 95, currentStreak: 5, longestStreak: 9, isAsleep: true, continent: 'Asia', country: 'Japan', city: 'Tokyo', lat: 35.68, lng: 139.69 },
  { uid: '4', displayName: 'Sofia R.', xp: 1400, credits: 60, currentStreak: 3, longestStreak: 7, isAsleep: false, continent: 'Europe', country: 'Italy', city: 'Rome', lat: 41.9, lng: 12.49 },
  { uid: '5', displayName: 'Kwame A.', xp: 980, credits: 40, currentStreak: 0, longestStreak: 4, isAsleep: true, continent: 'Africa', country: 'Ghana', city: 'Accra', lat: 5.55, lng: -0.2 },
  { uid: '6', displayName: 'Lena V.', xp: 750, credits: 30, currentStreak: 2, longestStreak: 6, isAsleep: false, continent: 'Europe', country: 'Germany', city: 'Berlin', lat: 52.52, lng: 13.4 },
];

export const mockObituaries = [
  {
    id: 'a',
    displayName: 'Carlos M.',
    streakLength: 9,
    timeOfDeath: '2026-04-19T02:47:00',
    obituaryText:
      'Carlos M. passed peacefully at 2:47 AM, betrayed by a WhatsApp group chat that had no business being active on a Tuesday. His 9-day streak — once a source of quiet pride — is survived by his screen time report. He will be remembered mostly by the algorithm.',
  },
  {
    id: 'b',
    displayName: 'Priya S.',
    streakLength: 4,
    timeOfDeath: '2026-04-18T01:12:00',
    obituaryText:
      "Priya S. was taken at 1:12 AM by a Netflix autoplay that asked 'Are you still watching?' She said yes. The streak said goodbye. Her last known words were 'just one more episode.'",
  },
  {
    id: 'c',
    displayName: 'Tom B.',
    streakLength: 22,
    timeOfDeath: '2026-04-17T03:30:00',
    obituaryText:
      'Tom B., holder of a 22-day streak that inspired jealousy across three continents, was felled at 3:30 AM by existential dread and a Reddit rabbit hole about the Roman Empire. He knew the risks. He scrolled anyway.',
  },
];

export const mockCurrentUser = mockPlayers[1];
