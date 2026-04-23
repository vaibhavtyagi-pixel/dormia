import { initializeApp } from 'firebase/app';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getDatabase, ref, set } from 'firebase/database';

const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_DATABASE_URL',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error('Missing env vars:', missing.join(', '));
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

const storeItems = [
  {
    itemId: 'shield_1',
    name: 'Streak Shield',
    type: 'consumable',
    costCoins: 80,
    isActive: true,
    description: 'Protects your streak for one failed night',
    meta: { effect: 'shield_plus_one' },
  },
  {
    itemId: 'theme_midnight',
    name: 'Midnight Theme',
    type: 'cosmetic',
    costCoins: 120,
    isActive: true,
    description: 'Unlocks a premium midnight UI style',
    meta: { effect: 'theme_unlock' },
  },
  {
    itemId: 'xp_boost_24h',
    name: 'XP Boost 24h',
    type: 'booster',
    costCoins: 150,
    isActive: true,
    description: 'Adds +10% XP for the next 24 hours',
    meta: { effect: 'xp_boost_10_percent' },
  },
];

async function seedStoreItems() {
  for (const item of storeItems) {
    await setDoc(
      doc(db, 'store_items', item.itemId),
      { ...item, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }
}

async function pickSamplePlayerUid() {
  const playersSnap = await getDocs(query(collection(db, 'players'), limit(1)));
  if (playersSnap.empty) return null;
  return playersSnap.docs[0].id;
}

async function seedLeagueAndMembership(uid) {
  const leagueId = 'LEAGUE_AB12';
  await setDoc(
    doc(db, 'leagues', leagueId),
    {
      leagueId,
      name: 'Night Owls',
      inviteCode: 'DOR-8291',
      ownerUid: uid ?? 'pending-owner',
      scope: 'private',
      isActive: true,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (uid) {
    await setDoc(
      doc(db, 'league_memberships', uid),
      {
        uid,
        leagueId,
        role: 'member',
        joinedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await setDoc(
      doc(db, `leagues/${leagueId}/members`, uid),
      {
        uid,
        joinedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

async function seedQuestsForUser(uid) {
  if (!uid) return;
  await setDoc(
    doc(db, `quests/${uid}/active`, 'weekly_3_targets'),
    {
      questId: 'weekly_3_targets',
      type: 'weekly',
      title: 'Hit target 3 nights this week',
      progress: 0,
      goal: 3,
      rewardXp: 150,
      rewardCoins: 40,
      status: 'active',
      expiresAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function seedDailyReward(uid) {
  if (!uid) return;
  await setDoc(
    doc(db, 'daily_rewards', uid),
    {
      uid,
      streakDay: 1,
      lastClaimAt: serverTimestamp(),
      cycleStartedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function seedRealtime(uid) {
  if (!uid) return;
  const playerDoc = await getDoc(doc(db, 'players', uid));
  const p = playerDoc.data() ?? {};
  try {
    await set(ref(rtdb, `dormia/players/${uid}`), {
      displayName: p.displayName ?? 'Player',
      isAsleep: p.isAsleep ?? false,
      continent: p.continent ?? 'Europe',
      country: p.country ?? 'Unknown',
      city: p.city ?? 'Unknown',
      lat: p.lat ?? 40.4168,
      lng: p.lng ?? -3.7038,
      lastSeenAt: Date.now(),
    });
  } catch (error) {
    console.warn('RTDB seed skipped due to permissions:', error.code ?? error.message);
  }
}

async function run() {
  console.log('Seeding Firebase...');
  await seedStoreItems();
  const uid = await pickSamplePlayerUid();
  await seedLeagueAndMembership(uid);
  await seedQuestsForUser(uid);
  await seedDailyReward(uid);
  await seedRealtime(uid);
  console.log('Seed completed.', { sampleUid: uid ?? 'none-found' });
}

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});

