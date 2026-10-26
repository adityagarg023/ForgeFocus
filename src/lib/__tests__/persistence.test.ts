import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTimerEngine } from "@/lib/use-timer-engine";
import { useSessions, isToday } from "@/lib/use-sessions";

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: null, isLoaded: true }),
}));

const ACTIVE_KEY = "forgefocus:active-session";
const HISTORY_KEY = "forgefocus:session-history";

beforeEach(() => {
  localStorage.clear();
});

describe("useTimerEngine — persistence", () => {
  it("starts with no active session", async () => {
    const { result } = renderHook(() => useTimerEngine());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.status).toBe("Idle");
    expect(result.current.session).toBeNull();
  });

  it("persists active session to localStorage", async () => {
    const { result } = renderHook(() => useTimerEngine());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => {
      result.current.start(60);
    });
    await waitFor(() => expect(localStorage.getItem(ACTIVE_KEY)).not.toBeNull());
    const stored = JSON.parse(
      localStorage.getItem(ACTIVE_KEY) || "null",
    );
    expect(stored).not.toBeNull();
    expect(stored.status).toBe("Running");
    expect(stored.plannedDuration).toBe(60_000);
  });

  it("restores active session from localStorage on mount", async () => {
    const fakeSession = {
      sessionId: "restore-1",
      status: "Running",
      startTime: Date.now() - 10_000,
      plannedDuration: 60_000,
      endTime: Date.now() + 50_000,
      pausedAt: null,
      timeLeftAtPaused: null,
      stopwatchStartTime: null,
      overtimeElapsed: 0,
      completedAt: null,
      discardTime: null,
      totalFocusTime: null,
    };
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(fakeSession));

    const { result } = renderHook(() => useTimerEngine());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await waitFor(() => expect(result.current.status).toBe("Running"));
    expect(result.current.session?.sessionId).toBe("restore-1");
  });

  it("clears localStorage on reset", async () => {
    const { result } = renderHook(() => useTimerEngine());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => {
      result.current.start(60);
    });
    act(() => {
      result.current.reset();
    });
    await waitFor(() => expect(localStorage.getItem(ACTIVE_KEY)).toBeNull());
  });

  it("saves completed session to history and clears active on reset", async () => {
    const { result } = renderHook(() => useTimerEngine());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => {
      result.current.start(60);
    });
    act(() => {
      result.current.complete("");
    });
    const history = JSON.parse(
      localStorage.getItem(HISTORY_KEY) || "[]",
    );
    expect(history).toHaveLength(1);
    expect(history[0].sessionId).toBe(result.current.session?.sessionId);
    expect(history[0].totalFocusTime).toBeGreaterThan(0);

    act(() => {
      result.current.reset();
    });
    await waitFor(() => expect(localStorage.getItem(ACTIVE_KEY)).toBeNull());
  });

  it("does not save duplicate sessions on repeated complete calls", async () => {
    const { result } = renderHook(() => useTimerEngine());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => {
      result.current.start(60);
    });
    act(() => {
      result.current.complete("");
    });
    // Second call should be blocked
    act(() => {
      result.current.complete("");
    });
    const history = JSON.parse(
      localStorage.getItem(HISTORY_KEY) || "[]",
    );
    expect(history).toHaveLength(1);
  });

  it("handles corrupted active session gracefully", async () => {
    localStorage.setItem(ACTIVE_KEY, "not-valid-json");
    const { result } = renderHook(() => useTimerEngine());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.status).toBe("Idle");
    await waitFor(() => expect(localStorage.getItem(ACTIVE_KEY)).toBeNull());
  });

  it("handles corrupted history gracefully", async () => {
    localStorage.setItem(HISTORY_KEY, "not-valid-json");
    const { result } = renderHook(() => useSessions());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.sessions).toEqual([]);
  });
});

describe("useSessions — today filter", () => {
  it("filters sessions to today only", async () => {
    const now = Date.now();
    const yesterday = now - 86_400_000;

    const sessions = [
      { sessionId: "a", plannedDuration: 60_000, totalFocusTime: 60_000, overtimeMs: 0, completedAt: now, notes: null },
      { sessionId: "b", plannedDuration: 30_000, totalFocusTime: 25_000, overtimeMs: 0, completedAt: yesterday, notes: null },
    ];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));

    const { result } = renderHook(() => useSessions());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.todaySessions).toHaveLength(1);
    expect(result.current.todaySessions[0].sessionId).toBe("a");
    expect(result.current.todayCount).toBe(1);
    expect(result.current.todayFocusMs).toBe(60_000);
  });

  it("aggregates today's total focus time", async () => {
    const now = Date.now();
    const sessions = [
      { sessionId: "a", plannedDuration: 60_000, totalFocusTime: 55_000, overtimeMs: 0, completedAt: now, notes: null },
      { sessionId: "b", plannedDuration: 30_000, totalFocusTime: 30_000, overtimeMs: 0, completedAt: now, notes: null },
    ];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));

    const { result } = renderHook(() => useSessions());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.todayFocusMs).toBe(85_000);
  });

  it("removes a session by id", async () => {
    const now = Date.now();
    const sessions = [
      { sessionId: "a", plannedDuration: 60_000, totalFocusTime: 60_000, overtimeMs: 0, completedAt: now, notes: null },
      { sessionId: "b", plannedDuration: 30_000, totalFocusTime: 30_000, overtimeMs: 0, completedAt: now, notes: null },
    ];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));

    const { result } = renderHook(() => useSessions());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => {
      result.current.removeSession("a");
    });
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].sessionId).toBe("b");
  });

  it("updates notes for a session", async () => {
    const now = Date.now();
    const sessions = [
      { sessionId: "a", plannedDuration: 60_000, totalFocusTime: 60_000, overtimeMs: 0, completedAt: now, notes: null },
    ];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));

    const { result } = renderHook(() => useSessions());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => {
      result.current.updateNotes("a", "Built the timer");
    });
    expect(result.current.sessions[0].notes).toBe("Built the timer");
  });
});

describe("isToday", () => {
  it("returns true for current timestamp", () => {
    expect(isToday(Date.now())).toBe(true);
  });

  it("returns false for yesterday", () => {
    expect(isToday(Date.now() - 86_400_000)).toBe(false);
  });
});
