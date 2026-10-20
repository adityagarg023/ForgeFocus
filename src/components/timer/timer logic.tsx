"use client";
import { useCallback, useEffect, useState } from "react";

export type TimerStatus =
  | "Running"
  | "Paused"
  | "Stopwatch Running"
  | "Stopwatch Paused"
  | "Complete"
  | "Discard";

export interface TimerSession {
  sessionId: string;
  status: TimerStatus;
  startTime: number;
  plannedDuration: number;
  endTime: number;
  pausedAt: number | null;
  timeLeftAtPaused: number | null;
  stopwatchStartTime: number | null;
  overtimeElapsed: number;
  completedAt: number | null;
  discardTime: number | null;
  totalFocusTime: number | null;
}

const ACTIVE_KEY = "forgefocus:active-session";
const HISTORY_KEY = "forgefocus:session-history";

type HistoryRecord = TimerSession & {
  savedAt: number;
};

function saveHistory(session: TimerSession) {
  if (typeof window === "undefined") return;

  const history: HistoryRecord[] = JSON.parse(
    localStorage.getItem(HISTORY_KEY) || "[]",
  );

  // Prevent duplicate records if a terminal state is restored.
  if (history.some((item) => item.sessionId === session.sessionId)) {
    return;
  }

  history.unshift({ ...session, savedAt: Date.now() });

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function useTimerEngine() {
  const [session, setSession] = useState<TimerSession | null>(null);
  const [now, setNow] = useState(Date.now());
  const [hydrated, setHydrated] = useState(false);

  // Recover the session after a page refresh.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(ACTIVE_KEY);

      if (saved) {
        setSession(JSON.parse(saved) as TimerSession);
      }
    } catch {
      sessionStorage.removeItem(ACTIVE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist the active session in this browser tab.
  useEffect(() => {
    if (!hydrated) return;

    if (session) {
      sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(ACTIVE_KEY);
    }
  }, [session, hydrated]);

  // Update the display and automatically start overtime.
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

      setSession((previous) => {
        if (!previous) return previous;

        if (previous.status === "Running" && currentTime >= previous.endTime) {
          return {
            ...previous,
            status: "Stopwatch Running",
            stopwatchStartTime: previous.endTime,
            overtimeElapsed: 0,
          };
        }

        return previous;
      });
    };

    tick();
    const interval = window.setInterval(tick, 250);

    return () => window.clearInterval(interval);
  }, [hydrated, session?.status, session?.endTime]);

  const start = useCallback((durationSeconds: number) => {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return;
    }

    const currentTime = Date.now();

    setSession({
      sessionId: crypto.randomUUID(),
      status: "Running",
      startTime: currentTime,
      plannedDuration: durationSeconds * 1000,
      endTime: currentTime + durationSeconds * 1000,
      pausedAt: null,
      timeLeftAtPaused: null,
      stopwatchStartTime: null,
      overtimeElapsed: 0,
      completedAt: null,
      discardTime: null,
      totalFocusTime: null,
    });
  }, []);

  const pause = useCallback(() => {
    const currentTime = Date.now();

    setSession((previous) => {
      if (!previous) return previous;

      if (previous.status === "Running") {
        const remaining = Math.max(0, previous.endTime - currentTime);

        // If time has expired, enter overtime instead.
        if (remaining === 0) {
          return {
            ...previous,
            status: "Stopwatch Running",
            stopwatchStartTime: previous.endTime,
            overtimeElapsed: 0,
          };
        }

        return {
          ...previous,
          status: "Paused",
          pausedAt: currentTime,
          timeLeftAtPaused: remaining,
        };
      }

      if (
        previous.status === "Stopwatch Running" &&
        previous.stopwatchStartTime !== null
      ) {
        return {
          ...previous,
          status: "Stopwatch Paused",
          overtimeElapsed:
            previous.overtimeElapsed +
            currentTime -
            previous.stopwatchStartTime,
          stopwatchStartTime: null,
          pausedAt: currentTime,
        };
      }

      return previous;
    });
  }, []);

  const resume = useCallback(() => {
    const currentTime = Date.now();

    setSession((previous) => {
      if (!previous) return previous;

      if (previous.status === "Paused" && previous.timeLeftAtPaused !== null) {
        return {
          ...previous,
          status: "Running",
          endTime: currentTime + previous.timeLeftAtPaused,
          pausedAt: null,
          timeLeftAtPaused: null,
        };
      }

      if (previous.status === "Stopwatch Paused") {
        return {
          ...previous,
          status: "Stopwatch Running",
          stopwatchStartTime: currentTime,
          pausedAt: null,
        };
      }

      return previous;
    });
  }, []);

  const complete = useCallback(() => {
    const currentTime = Date.now();

    setSession((previous) => {
      if (!previous || ["Complete", "Discard"].includes(previous.status)) {
        return previous;
      }

      let focusedTime: number;

      switch (previous.status) {
        case "Running":
          focusedTime =
            previous.plannedDuration -
            Math.max(0, previous.endTime - currentTime);
          break;

        case "Paused":
          focusedTime =
            previous.plannedDuration - (previous.timeLeftAtPaused ?? 0);
          break;

        case "Stopwatch Running":
          focusedTime =
            previous.plannedDuration +
            previous.overtimeElapsed +
            Math.max(
              0,
              currentTime - (previous.stopwatchStartTime ?? currentTime),
            );
          break;

        case "Stopwatch Paused":
          focusedTime = previous.plannedDuration + previous.overtimeElapsed;
          break;
      }

      const completed: TimerSession = {
        ...previous,
        status: "Complete",
        completedAt: currentTime,
        totalFocusTime: Math.max(0, focusedTime),
      };

      saveHistory(completed);
      return completed;
    });
  }, []);

  const discard = useCallback(() => {
    const currentTime = Date.now();

    setSession((previous) => {
      if (!previous || ["Complete", "Discard"].includes(previous.status)) {
        return previous;
      }

      const discarded: TimerSession = {
        ...previous,
        status: "Discard",
        discardTime: currentTime,
      };

      saveHistory(discarded);
      return discarded;
    });
  }, []);

  const reset = useCallback(() => {
    setSession(null);
  }, []);

  // Calculate display values from timestamps, not interval counts.
  let remainingMs = 0;
  let overtimeMs = 0;

  if (session) {
    if (session.status === "Running") {
      remainingMs = Math.max(0, session.endTime - now);
    } else if (session.status === "Paused") {
      remainingMs = session.timeLeftAtPaused ?? 0;
    }

    if (session.status === "Stopwatch Running") {
      overtimeMs =
        session.overtimeElapsed +
        Math.max(0, now - (session.stopwatchStartTime ?? now));
    } else if (session.status === "Stopwatch Paused") {
      overtimeMs = session.overtimeElapsed;
    }
  }

  return {
    session,
    status: session?.status ?? "Idle",
    remainingMs,
    overtimeMs,
    hydrated,
    start,
    pause,
    resume,
    complete,
    discard,
    reset,
  };
}
