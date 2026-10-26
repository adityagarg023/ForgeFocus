"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ActiveStatus,
  type SessionDisplay,
  type TimerSession,
  completeSession,
  computeDisplay,
  createSession,
  discardSession,
  maybeEnterOvertime,
  pauseSession,
  resumeSession,
} from "@/lib/timer-engine";

const ACTIVE_KEY = "forgefocus:active-session";
const HISTORY_KEY = "forgefocus:session-history";

export interface CompletedSession {
  sessionId: string;
  plannedDuration: number;
  totalFocusTime: number;
  overtimeMs: number;
  completedAt: number;
  startedAt?: number;
  notes: string | null;
}

function readActiveSession(): TimerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(ACTIVE_KEY);
    if (!saved) return null;
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid active session");
    const value = parsed as Partial<TimerSession>;
    const validStatus = [
      "Running", "Paused", "Stopwatch Running", "Stopwatch Paused", "Complete", "Discard",
    ].includes(value.status ?? "");
    const finite = (n: unknown) => typeof n === "number" && Number.isFinite(n);
    if (
      typeof value.sessionId === "string" &&
      value.sessionId.length > 0 &&
      validStatus &&
      finite(value.startTime) &&
      finite(value.plannedDuration) && value.plannedDuration > 0 &&
      finite(value.endTime) &&
      finite(value.overtimeElapsed) && value.overtimeElapsed >= 0 &&
      (value.pausedAt === null || finite(value.pausedAt)) &&
      (value.timeLeftAtPaused === null || finite(value.timeLeftAtPaused)) &&
      (value.stopwatchStartTime === null || finite(value.stopwatchStartTime)) &&
      (value.completedAt === null || finite(value.completedAt)) &&
      (value.discardTime === null || finite(value.discardTime)) &&
      (value.totalFocusTime === null || (finite(value.totalFocusTime) && value.totalFocusTime >= 0))
    ) {
      return value as TimerSession;
    }
    throw new Error("Invalid active session");
  } catch {
    try { localStorage.removeItem(ACTIVE_KEY); } catch { /* storage unavailable */ }
    return null;
  }
}

function writeActiveSession(session: TimerSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  } catch {
    // Storage can be disabled or full; the in-memory timer should continue.
  }
}

function loadCompletedSessions(): CompletedSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CompletedSession => {
      if (!item || typeof item !== "object") return false;
      const value = item as Partial<CompletedSession>;
      return typeof value.sessionId === "string" && value.sessionId.length > 0 &&
        typeof value.plannedDuration === "number" && Number.isFinite(value.plannedDuration) && value.plannedDuration > 0 &&
        typeof value.totalFocusTime === "number" && Number.isFinite(value.totalFocusTime) && value.totalFocusTime >= 0 &&
        typeof value.overtimeMs === "number" && Number.isFinite(value.overtimeMs) && value.overtimeMs >= 0 &&
        typeof value.completedAt === "number" && Number.isFinite(value.completedAt) &&
        (value.notes === null || typeof value.notes === "string");
    });
  } catch {
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* storage unavailable */ }
    return [];
  }
}

export type PersistCallback = (
  session: CompletedSession,
  status: "Complete" | "Discard",
) => void;

export function useTimerEngine(onPersist?: PersistCallback) {
  const [session, setSession] = useState<TimerSession | null>(null);
  const [now, setNow] = useState(Date.now());
  const [hydrated, setHydrated] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    const restored = readActiveSession();
    if (restored) setSession(restored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeActiveSession(session);
  }, [session, hydrated]);

  useEffect(() => {
    if (
      !hydrated ||
      !session ||
      !["Running", "Stopwatch Running"].includes(session.status)
    ) {
      return;
    }

    const tick = () => {
      const currentTime = Date.now();
      setNow(currentTime);
      setSession((previous) =>
        previous ? maybeEnterOvertime(previous, currentTime) : previous,
      );
    };

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [hydrated, session?.status, session?.endTime]);

  const start = useCallback((durationSeconds: number) => {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return;
    savingRef.current = false;
    setSession(
      createSession(
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        durationSeconds,
        Date.now(),
      ),
    );
  }, []);

  const pause = useCallback(() => {
    setSession((previous) =>
      previous ? pauseSession(previous, Date.now()) : previous,
    );
  }, []);

  const resume = useCallback(() => {
    setSession((previous) =>
      previous ? resumeSession(previous, Date.now()) : previous,
    );
  }, []);

  const complete = useCallback(
    (notes?: string): CompletedSession | null => {
      if (
        savingRef.current ||
        !session ||
        ["Complete", "Discard"].includes(session.status)
      ) return null;

      // Set the guard before scheduling React state updates so rapid clicks
      // cannot submit the same session more than once.
      savingRef.current = true;
      const completed = completeSession(session, Date.now());
      setSession(completed);
      const focusTime = completed.totalFocusTime ?? 0;
      const result: CompletedSession = {
        sessionId: completed.sessionId,
        plannedDuration: completed.plannedDuration,
        totalFocusTime: focusTime,
        overtimeMs: Math.max(0, focusTime - completed.plannedDuration),
        completedAt: completed.completedAt ?? Date.now(),
        startedAt: completed.startTime,
        notes: notes ?? null,
      };
      if (onPersist) {
        onPersist(result, "Complete");
      } else {
        const history = loadCompletedSessions();
        if (!history.some((item) => item.sessionId === result.sessionId)) {
          history.unshift(result);
          try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
          } catch {
            // The timer remains usable even when browser storage is unavailable.
          }
        }
      }
      return result;
    },
    [onPersist, session],
  );

  const discard = useCallback(() => {
    if (
      savingRef.current ||
      !session ||
      ["Complete", "Discard"].includes(session.status)
    ) return;
    savingRef.current = true;
    const discarded = discardSession(session, Date.now());
    setSession(discarded);
    const result: CompletedSession = {
      sessionId: discarded.sessionId,
      plannedDuration: discarded.plannedDuration,
      totalFocusTime: 0,
      overtimeMs: 0,
      completedAt: discarded.discardTime ?? Date.now(),
      startedAt: discarded.startTime,
      notes: null,
    };
    onPersist?.(result, "Discard");
  }, [onPersist, session]);

  const reset = useCallback(() => {
    savingRef.current = false;
    setSession(null);
  }, []);

  const display: SessionDisplay = computeDisplay(session, now);
  const status: ActiveStatus = session?.status ?? "Idle";

  return {
    session,
    status,
    remainingMs: display.remainingMs,
    overtimeMs: display.overtimeMs,
    hydrated,
    start,
    pause,
    resume,
    complete,
    discard,
    reset,
  };
}

export { loadCompletedSessions };
