import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppDataContext = createContext(null);

const KEYS = {
  diary: '@amparo/diary',
  moods: '@amparo/moods',
  sleep: '@amparo/sleep',
  profile: '@amparo/profile',
};

function todayISO() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function AppDataProvider({ children }) {
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [moodEntries, setMoodEntries] = useState([]);
  const [sleepSettings, setSleepSettings] = useState({ bedtime: '22:30', wakeTime: '06:30' });
  const [profile, setProfile] = useState({ name: 'Seu Nome', notifications: true });
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  // Load everything once on startup.
  useEffect(() => {
    (async () => {
      try {
        const [d, m, s, p] = await Promise.all([
          AsyncStorage.getItem(KEYS.diary),
          AsyncStorage.getItem(KEYS.moods),
          AsyncStorage.getItem(KEYS.sleep),
          AsyncStorage.getItem(KEYS.profile),
        ]);
        if (d) setDiaryEntries(JSON.parse(d));
        if (m) setMoodEntries(JSON.parse(m));
        if (s) setSleepSettings(JSON.parse(s));
        if (p) setProfile(JSON.parse(p));
      } catch (e) {
        // If storage fails, the app still works with in-memory defaults.
        console.warn('Amparo: falha ao carregar dados salvos', e);
      } finally {
        hydrated.current = true;
        setReady(true);
      }
    })();
  }, []);

  // Persist each slice whenever it changes (skip the very first render).
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(KEYS.diary, JSON.stringify(diaryEntries)).catch(() => {});
  }, [diaryEntries]);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(KEYS.moods, JSON.stringify(moodEntries)).catch(() => {});
  }, [moodEntries]);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(KEYS.sleep, JSON.stringify(sleepSettings)).catch(() => {});
  }, [sleepSettings]);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile)).catch(() => {});
  }, [profile]);

  // ---- Diary ----
  const addDiaryEntry = (text, dateLabel) => {
    setDiaryEntries((prev) => [
      { id: Date.now().toString(), date: dateLabel, text },
      ...prev,
    ]);
  };
  const updateDiaryEntry = (id, text) => {
    setDiaryEntries((prev) => prev.map((e) => (e.id === id ? { ...e, text } : e)));
  };
  const deleteDiaryEntry = (id) => {
    setDiaryEntries((prev) => prev.filter((e) => e.id !== id));
  };

  // ---- Moods ----
  // One record per day: registering again today replaces today's entry.
  const registerMood = (mood, tags) => {
    const date = todayISO();
    setMoodEntries((prev) => {
      const withoutToday = prev.filter((e) => e.date !== date);
      return [...withoutToday, { date, mood, tags }];
    });
  };
  const todaysMood = moodEntries.find((e) => e.date === todayISO()) || null;

  // ---- Value ----
  const value = {
    ready,
    diaryEntries,
    addDiaryEntry,
    updateDiaryEntry,
    deleteDiaryEntry,
    moodEntries,
    registerMood,
    todaysMood,
    sleepSettings,
    setSleepSettings,
    profile,
    setProfile,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}
