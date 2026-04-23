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
import { auth, db, rtdb } from '../firebase.js';
import { mockPlayers } from '../mockData.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [players, setPlayers] = useState(mockPlayers);
  const [membershipByUid, setMembershipByUid] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsLoading(false);

      if (!user) {
        setPlayerData(null);
        return;
      }

      const playerRef = doc(db, 'players', user.uid);
      const playerSnap = await getDoc(playerRef);

      if (!playerSnap.exists()) {
        await setDoc(playerRef, {
          displayName: user.displayName ?? 'Player',
          email: user.email ?? '',
          xp: 0,
          credits: 0,
          currentStreak: 0,
          longestStreak: 0,
          isAsleep: false,
          sleepTargetHours: 7,
          continent: 'Europe',
          createdAt: serverTimestamp(),
        });

        await set(ref(rtdb, `dormia/players/${user.uid}`), {
          isAsleep: false,
          displayName: user.displayName ?? 'Player',
          continent: 'Europe',
          lat: 40.4168,
          lng: -3.7038,
        });
      } else {
        const existing = playerSnap.data();
        await set(ref(rtdb, `dormia/players/${user.uid}`), {
          isAsleep: existing.isAsleep ?? false,
          displayName: existing.displayName ?? user.displayName ?? 'Player',
          continent: existing.continent ?? 'Europe',
          lat: existing.lat ?? 40.4168,
          lng: existing.lng ?? -3.7038,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    const unsubscribe = onSnapshot(doc(db, 'players', currentUser.uid), (snapshot) => {
      setPlayerData(snapshot.exists() ? { uid: currentUser.uid, ...snapshot.data() } : null);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'players')), (snapshot) => {
      if (snapshot.empty) {
        setPlayers(mockPlayers);
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
    if (!currentUser) {
      return;
    }
    await updateDoc(doc(db, 'players', currentUser.uid), {
      isAsleep,
    });
    await update(ref(rtdb, `dormia/players/${currentUser.uid}`), {
      isAsleep,
    });
  };

  const saveSettings = async ({ sleepTarget, continent }) => {
    if (!currentUser) {
      return;
    }
    await updateDoc(doc(db, 'players', currentUser.uid), {
      sleepTargetHours: sleepTarget,
      continent,
    });
    await update(ref(rtdb, `dormia/players/${currentUser.uid}`), {
      continent,
    });
  };

  const settings = useMemo(
    () => ({
      sleepTarget: playerData?.sleepTargetHours ?? 7,
      continent: playerData?.continent ?? 'Europe',
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
