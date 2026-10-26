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
    const parsed = JSON.parse(saved) as TimerSession;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.sessionId === "string" &&
      typeof parsed.status === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    localStorage.removeItem(ACTIVE_KEY);
    return null;
  }
}

function writeActiveSession(session: TimerSession | null) {
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

function loadCompletedSessions(): CompletedSession[] {
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
      if (savingRef.current) return null;
      let result: CompletedSession | null = null;

      setSession((previous) => {
        if (
          !previous ||
          ["Complete", "Discard"].includes(previous.status)
        ) {
          return previous;
        }
        const completed = completeSession(previous, Date.now());
        savingRef.current = true;
        const focusTime = completed.totalFocusTime ?? 0;
        result = {
          sessionId: completed.sessionId,
          plannedDuration: completed.plannedDuration,
          totalFocusTime: focusTime,
          overtimeMs: Math.max(0, focusTime - completed.plannedDuration),
          completedAt: completed.completedAt ?? Date.now(),
          startedAt: completed.startTime,
          notes: notes ?? null,
        };
        if (onPersist) onPersist(result, "Complete");
        return completed;
      });

      savingRef.current = false;
      return result;
    },
    [onPersist],
  );

  const discard = useCallback(() => {
    setSession((previous) => {
      if (!previous) return previous;
      if (["Complete", "Discard"].includes(previous.status)) return previous;
      const discarded = discardSession(previous, Date.now());
      if (onPersist) {
        const result: CompletedSession = {
          sessionId: discarded.sessionId,
          plannedDuration: discarded.plannedDuration,
          totalFocusTime: 0,
          overtimeMs: 0,
          completedAt: discarded.discardTime ?? Date.now(),
          startedAt: discarded.startTime,
          notes: null,
        };
        onPersist(result, "Discard");
      }
      return discarded;
    });
  }, [onPersist]);

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
