import { describe, it, expect } from "vitest";
import {
  createSession,
  pauseSession,
  resumeSession,
  completeSession,
  discardSession,
  computeFocusTime,
  computeDisplay,
  maybeEnterOvertime,
  formatTime,
  type TimerSession,
} from "@/lib/timer-engine";

const T0 = 1_000_000;
const SESSION_ID = "test-session-1";

function runningSession(plannedSec: number, startTime = T0): TimerSession {
  return createSession(SESSION_ID, plannedSec, startTime);
}

describe("createSession", () => {
  it("creates a running session with correct planned duration", () => {
    const s = createSession(SESSION_ID, 90, T0);
    expect(s.status).toBe("Running");
    expect(s.plannedDuration).toBe(90_000);
    expect(s.endTime).toBe(T0 + 90_000);
    expect(s.startTime).toBe(T0);
    expect(s.overtimeElapsed).toBe(0);
    expect(s.stopwatchStartTime).toBeNull();
    expect(s.pausedAt).toBeNull();
    expect(s.timeLeftAtPaused).toBeNull();
    expect(s.completedAt).toBeNull();
    expect(s.totalFocusTime).toBeNull();
  });

  it("computes endTime as startTime + plannedDuration", () => {
    const s = createSession(SESSION_ID, 3600, 5_000_000);
    expect(s.endTime).toBe(5_000_000 + 3_600_000);
  });
});

describe("formatTime", () => {
  it("formats zero milliseconds", () => {
    expect(formatTime(0)).toBe("00:00:00");
  });

  it("formats hours, minutes, and seconds", () => {
    expect(formatTime(3_661_000)).toBe("01:01:01");
  });

  it("formats large durations", () => {
    expect(formatTime(86_400_000)).toBe("24:00:00");
  });

  it("floors partial seconds", () => {
    expect(formatTime(1_999)).toBe("00:00:01");
  });
});

describe("computeDisplay", () => {
  it("returns zeros for null session", () => {
    expect(computeDisplay(null, T0)).toEqual({
      remainingMs: 0,
      overtimeMs: 0,
    });
  });

  it("shows remaining time while running", () => {
    const s = runningSession(60, T0);
    expect(computeDisplay(s, T0 + 30_000).remainingMs).toBe(30_000);
    expect(computeDisplay(s, T0 + 30_000).overtimeMs).toBe(0);
  });

  it("shows zero remaining when time expires but status is still Running", () => {
    const s = runningSession(60, T0);
    expect(computeDisplay(s, T0 + 70_000).remainingMs).toBe(0);
  });

  it("shows frozen remaining time while paused", () => {
    const s = pauseSession(runningSession(60, T0), T0 + 20_000);
    expect(s.status).toBe("Paused");
    expect(s.timeLeftAtPaused).toBe(40_000);
    expect(computeDisplay(s, T0 + 999_999).remainingMs).toBe(40_000);
  });

  it("shows overtime while in stopwatch running", () => {
    let s = runningSession(60, T0);
    s = maybeEnterOvertime(s, T0 + 60_000);
    expect(s.status).toBe("Stopwatch Running");
    const display = computeDisplay(s, T0 + 75_000);
    expect(display.remainingMs).toBe(0);
    expect(display.overtimeMs).toBe(15_000);
  });

  it("shows frozen overtime while stopwatch paused", () => {
    let s = runningSession(60, T0);
    s = maybeEnterOvertime(s, T0 + 60_000);
    s = pauseSession(s, T0 + 75_000);
    expect(s.status).toBe("Stopwatch Paused");
    const display = computeDisplay(s, T0 + 999_999);
    expect(display.overtimeMs).toBe(15_000);
  });
});

describe("maybeEnterOvertime", () => {
  it("does not transition before endTime", () => {
    const s = runningSession(60, T0);
    expect(maybeEnterOvertime(s, T0 + 59_000).status).toBe("Running");
  });

  it("transitions to stopwatch running at endTime", () => {
    const s = runningSession(60, T0);
    const result = maybeEnterOvertime(s, T0 + 60_000);
    expect(result.status).toBe("Stopwatch Running");
    expect(result.stopwatchStartTime).toBe(T0 + 60_000);
    expect(result.overtimeElapsed).toBe(0);
  });

  it("transitions after endTime", () => {
    const s = runningSession(60, T0);
    const result = maybeEnterOvertime(s, T0 + 120_000);
    expect(result.status).toBe("Stopwatch Running");
    expect(result.stopwatchStartTime).toBe(T0 + 60_000);
  });

  it("does not transition a paused session", () => {
    const s = pauseSession(runningSession(60, T0), T0 + 30_000);
    expect(maybeEnterOvertime(s, T0 + 999_999).status).toBe("Paused");
  });

  it("does not transition an already-overtime session", () => {
    let s = runningSession(60, T0);
    s = maybeEnterOvertime(s, T0 + 60_000);
    const result = maybeEnterOvertime(s, T0 + 70_000);
    expect(result.status).toBe("Stopwatch Running");
    expect(result.stopwatchStartTime).toBe(T0 + 60_000);
  });
});

describe("pauseSession", () => {
  it("pauses a running session and records remaining time", () => {
    const s = runningSession(60, T0);
    const paused = pauseSession(s, T0 + 20_000);
    expect(paused.status).toBe("Paused");
    expect(paused.pausedAt).toBe(T0 + 20_000);
    expect(paused.timeLeftAtPaused).toBe(40_000);
  });

  it("pauses a stopwatch running session and accumulates overtime", () => {
    let s = runningSession(60, T0);
    s = maybeEnterOvertime(s, T0 + 60_000);
    s = pauseSession(s, T0 + 75_000);
    expect(s.status).toBe("Stopwatch Paused");
    expect(s.overtimeElapsed).toBe(15_000);
    expect(s.stopwatchStartTime).toBeNull();
    expect(s.pausedAt).toBe(T0 + 75_000);
  });

  it("enters overtime if pausing exactly at zero remaining", () => {
    const s = runningSession(60, T0);
    const result = pauseSession(s, T0 + 60_000);
    expect(result.status).toBe("Stopwatch Running");
    expect(result.stopwatchStartTime).toBe(T0 + 60_000);
  });

  it("is idempotent on non-pausable statuses", () => {
    const complete = completeSession(runningSession(60, T0), T0 + 30_000);
    expect(pauseSession(complete, T0 + 31_000)).toBe(complete);
  });
});

describe("resumeSession", () => {
  it("resumes a paused session with adjusted endTime", () => {
    const s = pauseSession(runningSession(60, T0), T0 + 20_000);
    const resumed = resumeSession(s, T0 + 50_000);
    expect(resumed.status).toBe("Running");
    expect(resumed.endTime).toBe(T0 + 50_000 + 40_000);
    expect(resumed.pausedAt).toBeNull();
    expect(resumed.timeLeftAtPaused).toBeNull();
  });

  it("resumes a stopwatch paused session", () => {
    let s = runningSession(60, T0);
    s = maybeEnterOvertime(s, T0 + 60_000);
    s = pauseSession(s, T0 + 75_000);
    const resumed = resumeSession(s, T0 + 100_000);
    expect(resumed.status).toBe("Stopwatch Running");
    expect(resumed.stopwatchStartTime).toBe(T0 + 100_000);
    expect(resumed.overtimeElapsed).toBe(15_000);
  });

  it("is idempotent on non-resumable statuses", () => {
    const complete = completeSession(runningSession(60, T0), T0 + 30_000);
    expect(resumeSession(complete, T0 + 31_000)).toBe(complete);
  });
});

describe("computeFocusTime", () => {
  it("computes elapsed focus time while running", () => {
    const s = runningSession(60, T0);
    expect(computeFocusTime(s, T0 + 20_000)).toBe(20_000);
  });

  it("caps at planned duration if endTime has passed but status still Running", () => {
    const s = runningSession(60, T0);
    expect(computeFocusTime(s, T0 + 999_000)).toBe(60_000);
  });

  it("computes focus time while paused (planned minus remaining)", () => {
    const s = pauseSession(runningSession(60, T0), T0 + 20_000);
    expect(computeFocusTime(s, T0 + 999_000)).toBe(20_000);
  });

  it("computes focus time including overtime while stopwatch running", () => {
    let s = runningSession(60, T0);
    s = maybeEnterOvertime(s, T0 + 60_000);
    expect(computeFocusTime(s, T0 + 75_000)).toBe(75_000);
  });

  it("computes focus time when overtime is paused", () => {
    let s = runningSession(60, T0);
    s = maybeEnterOvertime(s, T0 + 60_000);
    s = pauseSession(s, T0 + 75_000);
    expect(computeFocusTime(s, T0 + 999_000)).toBe(75_000);
  });

  it("returns stored totalFocusTime for completed sessions", () => {
    const s = completeSession(runningSession(60, T0), T0 + 30_000);
    expect(computeFocusTime(s, T0 + 999_000)).toBe(30_000);
  });
});

describe("completeSession", () => {
  it("completes a running session with correct focus time", () => {
    const s = runningSession(60, T0);
    const result = completeSession(s, T0 + 30_000);
    expect(result.status).toBe("Complete");
    expect(result.completedAt).toBe(T0 + 30_000);
    expect(result.totalFocusTime).toBe(30_000);
  });

  it("completes a paused session with planned minus remaining", () => {
    const s = pauseSession(runningSession(60, T0), T0 + 20_000);
    const result = completeSession(s, T0 + 50_000);
    expect(result.totalFocusTime).toBe(20_000);
  });

  it("completes a stopwatch running session with overtime", () => {
    let s = runningSession(60, T0);
    s = maybeEnterOvertime(s, T0 + 60_000);
    const result = completeSession(s, T0 + 80_000);
    expect(result.totalFocusTime).toBe(80_000);
  });

  it("completes a stopwatch paused session", () => {
    let s = runningSession(60, T0);
    s = maybeEnterOvertime(s, T0 + 60_000);
    s = pauseSession(s, T0 + 80_000);
    const result = completeSession(s, T0 + 999_000);
    expect(result.totalFocusTime).toBe(80_000);
  });

  it("does not double-complete", () => {
    const s = completeSession(runningSession(60, T0), T0 + 30_000);
    const result = completeSession(s, T0 + 40_000);
    expect(result).toBe(s);
    expect(result.totalFocusTime).toBe(30_000);
  });

  it("does not complete a discarded session", () => {
    const s = discardSession(runningSession(60, T0), T0 + 10_000);
    const result = completeSession(s, T0 + 30_000);
    expect(result).toBe(s);
    expect(result.status).toBe("Discard");
  });

  it("never returns negative focus time", () => {
    const s = runningSession(60, T0);
    const result = completeSession(s, T0 - 10_000);
    expect(result.totalFocusTime).toBeGreaterThanOrEqual(0);
  });
});

describe("discardSession", () => {
  it("discards a running session", () => {
    const s = runningSession(60, T0);
    const result = discardSession(s, T0 + 10_000);
    expect(result.status).toBe("Discard");
    expect(result.discardTime).toBe(T0 + 10_000);
    expect(result.totalFocusTime).toBeNull();
  });

  it("does not discard a completed session", () => {
    const s = completeSession(runningSession(60, T0), T0 + 30_000);
    const result = discardSession(s, T0 + 31_000);
    expect(result).toBe(s);
  });

  it("does not double-discard", () => {
    const s = discardSession(runningSession(60, T0), T0 + 10_000);
    const result = discardSession(s, T0 + 20_000);
    expect(result).toBe(s);
  });
});

describe("full lifecycle: start → pause → resume → overtime → complete", () => {
  it("tracks focus time correctly across pause/resume and overtime", () => {
    let s = runningSession(60, T0);

    // 20s of focus
    s = pauseSession(s, T0 + 20_000);
    expect(s.timeLeftAtPaused).toBe(40_000);

    // Pause for 30s (should not count)
    s = resumeSession(s, T0 + 50_000);
    expect(s.endTime).toBe(T0 + 50_000 + 40_000);

    // Run until completion + 10s overtime
    const completeTime = T0 + 50_000 + 40_000 + 10_000;
    s = maybeEnterOvertime(s, completeTime);
    expect(s.status).toBe("Stopwatch Running");

    s = completeSession(s, completeTime);
    expect(s.status).toBe("Complete");
    expect(s.totalFocusTime).toBe(70_000); // 60s planned + 10s overtime
  });
});

describe("full lifecycle: overtime → pause → resume → complete", () => {
  it("accumulates overtime across a pause in overtime", () => {
    let s = runningSession(30, T0);
    s = maybeEnterOvertime(s, T0 + 30_000);
    s = pauseSession(s, T0 + 40_000);
    expect(s.overtimeElapsed).toBe(10_000);

    // Pause for a while
    s = resumeSession(s, T0 + 100_000);
    s = completeSession(s, T0 + 115_000);
    expect(s.totalFocusTime).toBe(55_000); // 30s planned + 10s + 15s overtime
  });
});
