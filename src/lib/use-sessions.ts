"use client";

import { useCallback, useEffect, useState } from "react";
import type { CompletedSession } from "@/lib/use-timer-engine";

const HISTORY_KEY = "forgefocus:session-history";
const STORAGE_EVENT = "forgefocus:sessions-updated";

function readSessions(): CompletedSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompletedSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    localStorage.removeItem(HISTORY_KEY);
    return [];
  }
}

function writeSessions(sessions: CompletedSession[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function isToday(timestamp: number): boolean {
  const date = new Date(timestamp);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function useSessions() {
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setSessions(readSessions());
  }, []);

  useEffect(() => {
    refresh();
    setHydrated(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === HISTORY_KEY) refresh();
    };
    const handleCustom = () => refresh();

    window.addEventListener("storage", handleStorage);
    window.addEventListener(STORAGE_EVENT, handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(STORAGE_EVENT, handleCustom);
    };
  }, [refresh]);

  const removeSession = useCallback((sessionId: string) => {
    const current = readSessions();
    writeSessions(current.filter((s) => s.sessionId !== sessionId));
  }, []);

  const updateNotes = useCallback(
    (sessionId: string, notes: string) => {
      const current = readSessions();
      writeSessions(
        current.map((s) =>
          s.sessionId === sessionId ? { ...s, notes } : s,
        ),
      );
    },
    [],
  );

  const todaySessions = hydrated
    ? sessions.filter((s) => isToday(s.completedAt))
    : [];

  const todayFocusMs = todaySessions.reduce(
    (sum, s) => sum + s.totalFocusTime,
    0,
  );

  return {
    sessions,
    todaySessions,
    todayCount: todaySessions.length,
    todayFocusMs,
    hydrated,
    removeSession,
    updateNotes,
    refresh,
  };
}
