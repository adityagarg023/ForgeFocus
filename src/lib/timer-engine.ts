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

export type ActiveStatus = TimerStatus | "Idle";

export interface SessionDisplay {
  remainingMs: number;
  overtimeMs: number;
}

export function createSession(
  sessionId: string,
  durationSeconds: number,
  now: number,
): TimerSession {
  return {
    sessionId,
    status: "Running",
    startTime: now,
    plannedDuration: durationSeconds * 1000,
    endTime: now + durationSeconds * 1000,
    pausedAt: null,
    timeLeftAtPaused: null,
    stopwatchStartTime: null,
    overtimeElapsed: 0,
    completedAt: null,
    discardTime: null,
    totalFocusTime: null,
  };
}

export function pauseSession(
  previous: TimerSession,
  now: number,
): TimerSession {
  if (previous.status === "Running") {
    const remaining = Math.max(0, previous.endTime - now);
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
      pausedAt: now,
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
        previous.overtimeElapsed + now - previous.stopwatchStartTime,
      stopwatchStartTime: null,
      pausedAt: now,
    };
  }

  return previous;
}

export function resumeSession(
  previous: TimerSession,
  now: number,
): TimerSession {
  if (previous.status === "Paused" && previous.timeLeftAtPaused !== null) {
    return {
      ...previous,
      status: "Running",
      endTime: now + previous.timeLeftAtPaused,
      pausedAt: null,
      timeLeftAtPaused: null,
    };
  }

  if (previous.status === "Stopwatch Paused") {
    return {
      ...previous,
      status: "Stopwatch Running",
      stopwatchStartTime: now,
      pausedAt: null,
    };
  }

  return previous;
}

export function computeFocusTime(previous: TimerSession, now: number): number {
  switch (previous.status) {
    case "Running":
      return previous.plannedDuration - Math.max(0, previous.endTime - now);
    case "Paused":
      return previous.plannedDuration - (previous.timeLeftAtPaused ?? 0);
    case "Stopwatch Running":
      return (
        previous.plannedDuration +
        previous.overtimeElapsed +
        Math.max(0, now - (previous.stopwatchStartTime ?? now))
      );
    case "Stopwatch Paused":
      return previous.plannedDuration + previous.overtimeElapsed;
    default:
      return previous.totalFocusTime ?? 0;
  }
}

export function completeSession(
  previous: TimerSession,
  now: number,
): TimerSession {
  if (!previous || ["Complete", "Discard"].includes(previous.status)) {
    return previous;
  }
  const focusedTime = computeFocusTime(previous, now);
  return {
    ...previous,
    status: "Complete",
    completedAt: now,
    totalFocusTime: Math.max(0, focusedTime),
  };
}

export function discardSession(
  previous: TimerSession,
  now: number,
): TimerSession {
  if (!previous || ["Complete", "Discard"].includes(previous.status)) {
    return previous;
  }
  return {
    ...previous,
    status: "Discard",
    discardTime: now,
  };
}

export function computeDisplay(
  session: TimerSession | null,
  now: number,
): SessionDisplay {
  if (!session) return { remainingMs: 0, overtimeMs: 0 };

  let remainingMs = 0;
  let overtimeMs = 0;

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

  return { remainingMs, overtimeMs };
}

export function maybeEnterOvertime(
  previous: TimerSession,
  now: number,
): TimerSession {
  if (previous.status === "Running" && now >= previous.endTime) {
    return {
      ...previous,
      status: "Stopwatch Running",
      stopwatchStartTime: previous.endTime,
      overtimeElapsed: 0,
    };
  }
  return previous;
}

export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}
