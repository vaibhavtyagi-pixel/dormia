import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import xlsx from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import { doc, serverTimestamp, setDoc, getFirestore } from 'firebase/firestore';

function parseArgs(argv) {
  const args = {
    file: '',
    apply: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--file') {
      args.file = argv[i + 1] ?? '';
      i += 1;
    } else if (token === '--apply') {
      args.apply = true;
    }
  }
  return args;
}

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

function getRequiredConfig() {
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

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  const str = String(value ?? '').trim().toLowerCase();
  return str === 'true' || str === '1' || str === 'yes';
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pick(row, keys, fallback = null) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key];
    }
  }
  return fallback;
}

function normalizeRow(row, index) {
  const uidRaw = pick(row, ['uid', 'UID', 'id', 'ID', '__EMPTY', 'userId', 'userid'], '').toString().trim();
  const uid = uidRaw || `xlsx_user_${index + 1}`;
  const displayName = String(pick(row, ['displayName', 'displayNam', 'name', 'Name'], 'Player')).trim();
  const email = String(pick(row, ['email', 'Email'], '')).trim();
  const city = String(pick(row, ['city', 'City'], 'Unknown')).trim();
  const country = String(pick(row, ['country', 'Country'], 'Unknown')).trim();
  const continent = String(pick(row, ['continent', 'Continent'], 'Europe')).trim();
  const xp = normalizeNumber(pick(row, ['xp', 'XP'], 0), 0);
  const credits = normalizeNumber(pick(row, ['credits', 'credit'], 0), 0);
  const currentStreak = normalizeNumber(pick(row, ['currentStreak', 'currentStrea', 'streak'], 0), 0);
  const longestStreak = normalizeNumber(pick(row, ['longestStreak', 'longestStre', 'longest'], 0), 0);
  const sleepTargetHours = Math.max(5, normalizeNumber(pick(row, ['sleepTargetHours', 'sleepTarget', 'sleepTarge', 'target'], 7), 7));
  const isAsleep = normalizeBoolean(pick(row, ['isAsleep', 'asleep'], false));
  const hasAndroidApk = normalizeBoolean(pick(row, ['hasAndroidApk', 'hasAndroid', 'android'], false));
  const lat = normalizeNumber(pick(row, ['lat', 'latitude'], 40.4168), 40.4168);
  const lng = normalizeNumber(pick(row, ['lng', 'long', 'longitude'], -3.7038), -3.7038);
  return {
    uid,
    displayName: displayName || 'Player',
    email,
    city: city || 'Unknown',
    country: country || 'Unknown',
    continent: continent || 'Europe',
    xp,
    credits,
    currentStreak,
    longestStreak,
    sleepTargetHours,
    isAsleep,
    hasAndroidApk,
    lat,
    lng,
  };
}

async function run() {
  const { file, apply } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error('Usage: node scripts/importPlayersFromXlsx.mjs --file "dormia/dummy_users_fixed.xlsx" [--apply]');
    process.exit(1);
  }
  const absoluteFile = path.resolve(file);
  if (!fs.existsSync(absoluteFile)) {
    console.error(`File not found: ${absoluteFile}`);
    process.exit(1);
  }

  const workbook = xlsx.readFile(absoluteFile);
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    console.error('No sheets found in xlsx.');
    process.exit(1);
  }
  const sheet = workbook.Sheets[firstSheet];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
  const normalized = rows.map(normalizeRow).filter((item) => Boolean(item.uid));
  const uniqueByUid = new Map(normalized.map((item) => [item.uid, item]));
  const players = [...uniqueByUid.values()];

  console.log(`Parsed ${rows.length} rows, ready to import ${players.length} unique users.`);
  if (!apply) {
    console.log('Dry run only. Add --apply to write Firestore + RTDB.');
    return;
  }

  const firebaseConfig = getRequiredConfig();
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const rtdb = getDatabase(app);

  for (const player of players) {
    await setDoc(
      doc(db, 'players', player.uid),
      {
        ...player,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    try {
      await set(ref(rtdb, `dormia/players/${player.uid}`), {
        displayName: player.displayName,
        isAsleep: player.isAsleep,
        continent: player.continent,
        country: player.country,
        city: player.city,
        lat: player.lat,
        lng: player.lng,
        lastSeenAt: Date.now(),
      });
    } catch (error) {
      const message = String(error?.message ?? '').toLowerCase();
      if (!message.includes('permission_denied')) {
        throw error;
      }
    }
  }

  console.log(`Imported ${players.length} users into Firestore + RTDB.`);
}

run().catch((error) => {
  console.error('Import failed:', error?.message ?? error);
  process.exit(1);
});
