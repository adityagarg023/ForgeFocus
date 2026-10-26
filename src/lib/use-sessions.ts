"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import type { CompletedSession } from "@/lib/use-timer-engine";
import type { SessionRecord, CreateSessionInput } from "@/lib/session-types";
import { sessionsApi, SessionsApiError } from "@/lib/sessions-api";

const HISTORY_KEY = "forgefocus:session-history";
const STORAGE_EVENT = "forgefocus:sessions-updated";

function readLocalSessions(): CompletedSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CompletedSession => {
      if (!item || typeof item !== "object") return false;
      const session = item as Partial<CompletedSession>;
      return (
        typeof session.sessionId === "string" &&
        session.sessionId.length > 0 &&
        typeof session.plannedDuration === "number" &&
        Number.isFinite(session.plannedDuration) &&
        session.plannedDuration > 0 &&
        typeof session.totalFocusTime === "number" &&
        Number.isFinite(session.totalFocusTime) &&
        session.totalFocusTime >= 0 &&
        typeof session.overtimeMs === "number" &&
        Number.isFinite(session.overtimeMs) &&
        session.overtimeMs >= 0 &&
        typeof session.completedAt === "number" &&
        Number.isFinite(session.completedAt) &&
        (session.startedAt === undefined ||
          (typeof session.startedAt === "number" && Number.isFinite(session.startedAt))) &&
        (session.notes === null || typeof session.notes === "string")
      );
    });
  } catch {
    localStorage.removeItem(HISTORY_KEY);
    return [];
  }
}

function writeLocalSessions(sessions: CompletedSession[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
    window.dispatchEvent(new Event(STORAGE_EVENT));
  } catch {
    // Storage may be unavailable or full; keep the UI responsive.
  }
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

function sessionRecordToCompleted(record: SessionRecord): CompletedSession {
  return {
    sessionId: record.sessionId,
    plannedDuration: record.plannedDuration,
    totalFocusTime: record.totalFocusTime,
    overtimeMs: record.overtimeMs,
    completedAt: record.completedAt,
    startedAt: record.startedAt,
    notes: record.notes,
  };
}

function completedToCreateInput(
  session: CompletedSession,
  status: "Complete" | "Discard",
): CreateSessionInput {
  return {
    sessionId: session.sessionId,
    status,
    plannedDuration: session.plannedDuration,
    totalFocusTime: session.totalFocusTime,
    overtimeMs: session.overtimeMs,
    startedAt: session.startedAt ?? session.completedAt - session.totalFocusTime,
    completedAt: session.completedAt,
    notes: session.notes,
  };
}

export function useSessions() {
  const { user, isLoaded } = useUser();
  const isSignedIn = !!user;
  const userId = user?.id ?? null;

  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLocal = useCallback(() => {
    setSessions(readLocalSessions());
  }, []);

  const refreshServer = useCallback(async (signal?: AbortSignal) => {
    try {
      const records = await sessionsApi.list(signal);
      if (signal?.aborted) return;
      setSessions(records.map(sessionRecordToCompleted));
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      if (err instanceof SessionsApiError && err.statusCode === 401) {
        setError("Please sign in to view your sessions.");
      } else {
        setError("Could not load sessions. Please try again.");
      }
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // Clear account-specific state on identity changes so one account's
    // cached history is never shown while another account is loading.
    setSessions([]);
    setError(null);
    setHydrated(false);

    if (isSignedIn) {
      const controller = new AbortController();
      refreshServer(controller.signal).finally(() => {
        if (!controller.signal.aborted) setHydrated(true);
      });
      return () => controller.abort();
    }

    refreshLocal();
    setHydrated(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === HISTORY_KEY) refreshLocal();
    };
    const handleCustom = () => refreshLocal();

    window.addEventListener("storage", handleStorage);
    window.addEventListener(STORAGE_EVENT, handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(STORAGE_EVENT, handleCustom);
    };
  }, [isLoaded, isSignedIn, userId, refreshLocal, refreshServer]);

  const removeSession = useCallback(
    async (sessionId: string) => {
      if (isSignedIn) {
        try {
          await sessionsApi.delete(sessionId);
          setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
        } catch (err) {
          if (err instanceof SessionsApiError) {
            setError(err.message);
          } else {
            setError("Could not delete the session.");
          }
        }
      } else {
        const current = readLocalSessions();
        writeLocalSessions(current.filter((s) => s.sessionId !== sessionId));
      }
    },
    [isSignedIn],
  );

  const updateNotes = useCallback(
    async (sessionId: string, notes: string) => {
      if (isSignedIn) {
        try {
          await sessionsApi.update(sessionId, { notes });
          setSessions((prev) =>
            prev.map((s) => (s.sessionId === sessionId ? { ...s, notes } : s)),
          );
        } catch (err) {
          if (err instanceof SessionsApiError) {
            setError(err.message);
          } else {
            setError("Could not update notes.");
          }
        }
      } else {
        const current = readLocalSessions();
        writeLocalSessions(
          current.map((s) =>
            s.sessionId === sessionId ? { ...s, notes } : s,
          ),
        );
      }
    },
    [isSignedIn],
  );

  const saveCompletedSession = useCallback(
    async (session: CompletedSession, status: "Complete" | "Discard") => {
      if (isSignedIn) {
        try {
          await sessionsApi.create(completedToCreateInput(session, status));
          await refreshServer();
        } catch (err) {
          if (err instanceof SessionsApiError) {
            setError(err.message);
          } else {
            setError("Could not save the session.");
          }
        }
      } else {
        const history = readLocalSessions();
        if (history.some((item) => item.sessionId === session.sessionId)) return;
        history.unshift(session);
        writeLocalSessions(history);
      }
    },
    [isSignedIn, refreshServer],
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
    error,
    removeSession,
    updateNotes,
    saveCompletedSession,
    refresh: isSignedIn ? refreshServer : refreshLocal,
  };
}
