import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { initializeApp } from 'firebase/app';
import {
  Timestamp,
  collection,
  getDocs,
  getFirestore,
  updateDoc,
  doc,
} from 'firebase/firestore';

function parseEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, 'utf8');
  const result = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    result[key] = value;
  }
  return result;
}

function getConfig() {
  const rootEnv = parseEnvFile(path.resolve('.env'));
  const nestedEnv = parseEnvFile(path.resolve('dormia/.env'));
  const merged = { ...nestedEnv, ...rootEnv, ...process.env };
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_DATABASE_URL',
  ];
  const missing = required.filter((key) => !merged[key]);
  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }
  return {
    apiKey: merged.VITE_FIREBASE_API_KEY,
    authDomain: merged.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: merged.VITE_FIREBASE_PROJECT_ID,
    storageBucket: merged.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: merged.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: merged.VITE_FIREBASE_APP_ID,
    databaseURL: merged.VITE_FIREBASE_DATABASE_URL,
  };
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  return null;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function run() {
  const config = getConfig();
  const app = initializeApp(config);
  const db = getFirestore(app);

  const playersSnap = await getDocs(collection(db, 'players'));
  if (playersSnap.empty) {
    console.log('No players found.');
    return;
  }

  let updated = 0;
  for (const playerDoc of playersSnap.docs) {
    const player = playerDoc.data();

    const currentSleepStart = toDate(player.lastSleepStart);
    const currentSleepEnd = toDate(player.lastSleepEnd);
    const hadDuration = Number.isFinite(Number(player.lastSleepDurationMinutes));
    const hadRewardXp = Number.isFinite(Number(player.lastSleepRewardXp));
    const hadRewardCredits = Number.isFinite(Number(player.lastSleepRewardCredits));

    let start = currentSleepStart;
    let end = currentSleepEnd;

    if (!start || !end || end <= start) {
      const endDate = end ?? new Date();
      const minutes = randomInt(16, 540);
      start = new Date(endDate.getTime() - minutes * 60 * 1000);
      end = endDate;
    }

    const computedMinutes = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (60 * 1000))
    );

    const updates = {};
    if (!currentSleepStart || !currentSleepEnd || end <= start) {
      updates.lastSleepStart = Timestamp.fromDate(start);
      updates.lastSleepEnd = Timestamp.fromDate(end);
    }
    if (!hadDuration) updates.lastSleepDurationMinutes = computedMinutes;
    if (!hadRewardXp) updates.lastSleepRewardXp = randomInt(8, 120);
    if (!hadRewardCredits) updates.lastSleepRewardCredits = randomInt(2, 24);
    if (typeof player.lastSleepHitTarget !== 'boolean') updates.lastSleepHitTarget = randomInt(0, 1) === 1;

    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, 'players', playerDoc.id), updates);
      updated += 1;
    }
  }

  console.log(`Backfill done. Updated ${updated} players.`);
}

run().catch((error) => {
  console.error('Backfill failed:', error?.message ?? error);
  process.exit(1);
});
