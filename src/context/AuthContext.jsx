import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { ref, set, update } from 'firebase/database';
import { auth, db, hasFirebaseConfig, rtdb } from '../firebase.js';

const AuthContext = createContext(null);
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function getBrowserCoords() {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: Number(position.coords.latitude.toFixed(5)),
          lng: Number(position.coords.longitude.toFixed(5)),
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  });
}

async function reverseGeocode(lat, lng) {
  if (!GOOGLE_MAPS_API_KEY) return { city: 'Unknown', country: 'Unknown' };
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
    );
    if (!response.ok) return { city: 'Unknown', country: 'Unknown' };
    const payload = await response.json();
    const first = payload?.results?.[0];
    if (!first?.address_components) return { city: 'Unknown', country: 'Unknown' };
    const cityComponent =
      first.address_components.find((item) => item.types?.includes('locality')) ||
      first.address_components.find((item) => item.types?.includes('administrative_area_level_2'));
    const countryComponent = first.address_components.find((item) => item.types?.includes('country'));
    return {
      city: cityComponent?.long_name ?? 'Unknown',
      country: countryComponent?.long_name ?? 'Unknown',
    };
  } catch {
    return { city: 'Unknown', country: 'Unknown' };
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [membershipByUid, setMembershipByUid] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!hasFirebaseConfig || !auth || !db || !rtdb) {
      setCurrentUser(null);
      setPlayerData(null);
      setPlayers([]);
      setIsLoading(false);
      return undefined;
    }

    const loadingTimeout = window.setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        setCurrentUser(user);
        setIsLoading(false);

        if (!user) {
          setPlayerData(null);
          return;
        }

        const playerRef = doc(db, 'players', user.uid);
        const playerSnap = await getDoc(playerRef);

        if (!playerSnap.exists()) {
          const coords = await getBrowserCoords();
          const geo = coords ? await reverseGeocode(coords.lat, coords.lng) : { city: 'Unknown', country: 'Unknown' };
          await setDoc(playerRef, {
            displayName: user.displayName ?? 'Player',
            email: user.email ?? '',
            xp: 0,
            credits: 0,
            currentStreak: 0,
            longestStreak: 0,
            isAsleep: false,
            hasAndroidApk: false,
            sleepTargetHours: 7,
            continent: 'Europe',
            city: geo.city,
            country: geo.country,
            lat: coords?.lat ?? 40.4168,
            lng: coords?.lng ?? -3.7038,
            createdAt: serverTimestamp(),
          });

          await set(ref(rtdb, `dormia/players/${user.uid}`), {
            isAsleep: false,
            displayName: user.displayName ?? 'Player',
            continent: 'Europe',
            city: geo.city,
            country: geo.country,
            lat: coords?.lat ?? 40.4168,
            lng: coords?.lng ?? -3.7038,
          });
        } else {
          const existing = playerSnap.data();
          const needsLocation =
            !Number.isFinite(existing?.lat) ||
            !Number.isFinite(existing?.lng) ||
            !existing?.city ||
            !existing?.country ||
            existing?.city === 'Unknown' ||
            existing?.country === 'Unknown';
          let coords = null;
          let geo = { city: existing?.city ?? 'Unknown', country: existing?.country ?? 'Unknown' };
          if (needsLocation) {
            coords = await getBrowserCoords();
            if (coords) {
              geo = await reverseGeocode(coords.lat, coords.lng);
              await updateDoc(playerRef, {
                city: geo.city,
                country: geo.country,
                lat: coords.lat,
                lng: coords.lng,
              });
            }
          }
          await set(ref(rtdb, `dormia/players/${user.uid}`), {
            isAsleep: existing.isAsleep ?? false,
            displayName: existing.displayName ?? user.displayName ?? 'Player',
            continent: existing.continent ?? 'Europe',
            city: geo.city,
            country: geo.country,
            lat: coords?.lat ?? existing.lat ?? 40.4168,
            lng: coords?.lng ?? existing.lng ?? -3.7038,
          });
        }
      },
      () => {
        setCurrentUser(null);
        setPlayerData(null);
        setIsLoading(false);
      }
    );

    return () => {
      window.clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!db) return undefined;
    if (!currentUser) {
      return undefined;
    }

    const unsubscribe = onSnapshot(doc(db, 'players', currentUser.uid), (snapshot) => {
      setPlayerData(snapshot.exists() ? { uid: currentUser.uid, ...snapshot.data() } : null);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!db) return undefined;
    const unsubscribe = onSnapshot(query(collection(db, 'players')), (snapshot) => {
      if (snapshot.empty) {
        setPlayers([]);
        return;
      }

      const livePlayers = snapshot.docs.map((item) => ({
        uid: item.id,
        lat: 40.4168,
        lng: -3.7038,
        city: 'Unknown',
        country: 'Unknown',
        ...item.data(),
      }));
      setPlayers(livePlayers);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db) return undefined;
    const unsubscribe = onSnapshot(collection(db, 'league_memberships'), (snapshot) => {
      if (snapshot.empty) {
        setMembershipByUid({});
        return;
      }
      const next = {};
      snapshot.forEach((item) => {
        next[item.id] = item.data();
      });
      setMembershipByUid(next);
    });

    return () => unsubscribe();
  }, []);

  const setCurrentUserSleepState = async (isAsleep) => {
    if (!currentUser || !db || !rtdb) {
      return;
    }
    await updateDoc(doc(db, 'players', currentUser.uid), {
      isAsleep,
    });
    await update(ref(rtdb, `dormia/players/${currentUser.uid}`), {
      isAsleep,
    });
  };

  const saveSettings = async ({ sleepTarget, continent, hasAndroidApk }) => {
    if (!currentUser || !db || !rtdb) {
      return;
    }
    const normalizedSleepTarget = Math.max(5, Number(sleepTarget) || 5);
    await updateDoc(doc(db, 'players', currentUser.uid), {
      sleepTargetHours: normalizedSleepTarget,
      continent,
      hasAndroidApk: Boolean(hasAndroidApk),
    });
    await update(ref(rtdb, `dormia/players/${currentUser.uid}`), {
      continent,
    });
  };

  const settings = useMemo(
    () => ({
      sleepTarget: playerData?.sleepTargetHours ?? 7,
      continent: playerData?.continent ?? 'Europe',
      hasAndroidApk: Boolean(playerData?.hasAndroidApk),
    }),
    [playerData]
  );

  const value = {
    currentUser,
    playerData,
    players,
    membershipByUid,
    currentLeagueId: currentUser ? membershipByUid[currentUser.uid]?.leagueId ?? null : null,
    settings,
    isLoading,
    setCurrentUserSleepState,
    saveSettings,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
