"use client";

import { useEffect, useState, useCallback } from "react";
import { formatTime } from "@/lib/timer-engine";
import { useTimerEngine, type CompletedSession } from "@/lib/use-timer-engine";
import { useSessions } from "@/lib/use-sessions";

function TimeInput({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
}) {
  return (
    <input
      aria-label={label}
      type="text"
      inputMode="numeric"
      maxLength={2}
      value={value}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "").slice(0, 2);
        if (digits === "") {
          onChange("");
          return;
        }
        onChange(String(Math.min(Number(digits), max)));
      }}
      onBlur={() => {
        onChange(value === "" ? "00" : value.padStart(2, "0"));
      }}
      className="w-[1.7em] bg-transparent text-center outline-none"
    />
  );
}

export default function Timer() {
  const [hours, setHours] = useState("00");
  const [minutes, setMinutes] = useState("00");
  const [seconds, setSeconds] = useState("00");
  const [notes, setNotes] = useState("");

  const { updateNotes, saveCompletedSession, error: sessionsError } = useSessions();

  const handlePersist = useCallback(
    (session: CompletedSession, status: "Complete" | "Discard") => {
      saveCompletedSession(session, status);
    },
    [saveCompletedSession],
  );

  const timer = useTimerEngine(handlePersist);
  const { status, session } = timer;

  if (!timer.hydrated) {
    return (
      <div className="flex min-h-60 items-center justify-center text-[#6e7681]">
        Restoring your timer...
      </div>
    );
  }

  const isIdle = status === "Idle";
  const isActive = [
    "Running",
    "Paused",
    "Stopwatch Running",
    "Stopwatch Paused",
  ].includes(status);

  const selectedSeconds =
    Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);

  const isCountdown = status === "Running" || status === "Paused";

  const displayTime = isIdle
    ? null
    : isCountdown
      ? formatTime(timer.remainingMs)
      : status === "Stopwatch Running" || status === "Stopwatch Paused"
        ? formatTime(timer.overtimeMs)
        : formatTime(session?.totalFocusTime ?? 0);

  const handleFinish = () => {
    timer.complete("");
  };

  const handleSaveNotes = async () => {
    if (!session || status !== "Complete") return;

    const completedSession: CompletedSession = {
      sessionId: session.sessionId,
      plannedDuration: session.plannedDuration,
      totalFocusTime: session.totalFocusTime ?? 0,
      overtimeMs: Math.max(
        0,
        (session.totalFocusTime ?? 0) - session.plannedDuration,
      ),
      completedAt: session.completedAt ?? Date.now(),
      startedAt: session.startTime,
      notes: notes.trim(),
    };

    // Retry the idempotent create first, then save notes. Keep the summary
    // visible if either request fails so the user can retry without losing it.
    const saved = await saveCompletedSession(completedSession, "Complete");
    if (!saved) return;
    const notesSaved = await updateNotes(session.sessionId, notes.trim());
    if (notesSaved) {
      setNotes("");
      timer.reset();
    }
  };

  return (
    <div className="mx-auto flex w-[90%] max-w-3xl flex-col items-center gap-6 rounded-3xl border border-[#30363d] bg-[#161b22]/80 px-4 py-10 backdrop-blur-sm sm:px-10">
      <div className="flex items-center gap-2 text-xs text-[#6e7681]">
        <StatusDot status={status} />
        <span>
          {status === "Idle" && "Ready to focus"}
          {status === "Running" && "Focus session in progress"}
          {status === "Paused" && "Paused"}
          {status === "Stopwatch Running" && "Overtime — keep going!"}
          {status === "Stopwatch Paused" && "Overtime paused"}
          {status === "Complete" && "Session completed"}
          {status === "Discard" && "Session discarded"}
        </span>
      </div>

      {sessionsError && (
        <div className="w-full max-w-md rounded-xl border border-[#f85149]/30 bg-[#f85149]/10 px-4 py-3 text-sm text-[#f85149]">
          {sessionsError}
        </div>
      )}

      <div className="whitespace-nowrap font-extrabold text-[clamp(2.5rem,12vw,7rem)] tabular-nums">
        {isIdle ? (
          <div className="flex items-center justify-center text-[#e6edf3]">
            <TimeInput label="Hours" value={hours} onChange={setHours} max={99} />
            <span className="text-[#30363d]">:</span>
            <TimeInput label="Minutes" value={minutes} onChange={setMinutes} max={59} />
            <span className="text-[#30363d]">:</span>
            <TimeInput label="Seconds" value={seconds} onChange={setSeconds} max={59} />
          </div>
        ) : (
          <div
            className={`text-center ${
              status.startsWith("Stopwatch")
                ? "text-[#d29922]"
                : status === "Complete"
                  ? "text-[#3fb950]"
                  : "text-[#e6edf3]"
            }`}
          >
            {status.startsWith("Stopwatch") ? `+${displayTime}` : displayTime}
          </div>
        )}
      </div>

      <div className="flex h-6 items-center gap-3 text-sm text-[#6e7681]">
        {isIdle && <span>Set your planned focus duration</span>}
        {isCountdown && (
          <span>
            Planned: {formatTime(session?.plannedDuration ?? 0)}
          </span>
        )}
        {(status === "Stopwatch Running" || status === "Stopwatch Paused") && (
          <span>
            Planned: {formatTime(session?.plannedDuration ?? 0)} · Overtime
          </span>
        )}
      </div>

      {status === "Complete" && session && (
        <div className="animate-fade-in-up w-full max-w-md rounded-2xl border border-[#30363d] bg-[#1c2128] p-5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <SummaryStat
              label="Planned"
              value={formatTime(session.plannedDuration)}
            />
            <SummaryStat
              label="Focused"
              value={formatTime(session.totalFocusTime ?? 0)}
              color="text-[#3fb950]"
            />
            <SummaryStat
              label="Overtime"
              value={formatTime(
                Math.max(0, (session.totalFocusTime ?? 0) - session.plannedDuration),
              )}
              color={
                (session.totalFocusTime ?? 0) > session.plannedDuration
                  ? "text-[#d29922]"
                  : "text-[#6e7681]"
              }
            />
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="What did you accomplish? (optional)"
            className="mt-4 w-full resize-none rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-sm text-[#e6edf3] placeholder:text-[#6e7681] focus:border-[#2f81f7]"
          />

          <button
            onClick={handleSaveNotes}
            className="mt-3 w-full rounded-xl bg-[#2f81f7] py-3 font-semibold text-white transition-colors hover:bg-[#1f6feb]"
          >
            Save Session
          </button>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {isIdle && (
          <button
            onClick={() => timer.start(selectedSeconds)}
            disabled={selectedSeconds <= 0}
            className="rounded-xl bg-[#2f81f7] px-8 py-3.5 font-semibold text-white transition-all hover:bg-[#1f6feb] disabled:cursor-not-allowed disabled:opacity-30"
          >
            Start Focus
          </button>
        )}

        {(status === "Running" || status === "Stopwatch Running") && (
          <button
            onClick={timer.pause}
            className="rounded-xl border border-[#30363d] bg-[#1c2128] px-6 py-3.5 font-semibold text-[#e6edf3] transition-colors hover:border-[#8b949e]"
          >
            Pause
          </button>
        )}

        {(status === "Paused" || status === "Stopwatch Paused") && (
          <button
            onClick={timer.resume}
            className="rounded-xl bg-[#3fb950] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-[#2ea043]"
          >
            Resume
          </button>
        )}

        {isActive && (
          <>
            <button
              onClick={handleFinish}
              className="rounded-xl bg-[#2f81f7] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-[#1f6feb]"
            >
              Finish
            </button>

            <button
              onClick={() => {
                if (window.confirm("Discard this focus session?")) {
                  timer.discard();
                }
              }}
              className="rounded-xl border border-[#f85149]/50 px-6 py-3.5 font-semibold text-[#f85149] transition-colors hover:bg-[#f85149]/10"
            >
              Discard
            </button>
          </>
        )}

        {(status === "Complete" || status === "Discard") && (
          <button
            onClick={timer.reset}
            className="rounded-xl bg-[#2f81f7] px-8 py-3.5 font-semibold text-white transition-colors hover:bg-[#1f6feb]"
          >
            New Session
          </button>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "Running" || status === "Stopwatch Running"
      ? "bg-[#3fb950]"
      : status === "Paused" || status === "Stopwatch Paused"
        ? "bg-[#d29922]"
        : status === "Complete"
          ? "bg-[#2f81f7]"
          : status === "Discard"
            ? "bg-[#f85149]"
            : "bg-[#30363d]";

  const animate =
    status === "Running" || status === "Stopwatch Running" ? "animate-pulse" : "";

  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color} ${animate}`}
    />
  );
}

function SummaryStat({
  label,
  value,
  color = "text-[#e6edf3]",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
      <div className="mt-0.5 text-xs text-[#6e7681]">{label}</div>
    </div>
  );
}
