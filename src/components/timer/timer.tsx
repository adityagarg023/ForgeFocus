"use client";

import { useState } from "react";
import { formatTime } from "@/lib/timer-engine";
import { useTimerEngine } from "@/lib/use-timer-engine";

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

  const timer = useTimerEngine();

  if (!timer.hydrated) {
    return (
      <div className="flex min-h-60 items-center justify-center text-white">
        Restoring your timer...
      </div>
    );
  }

  const { status, session } = timer;

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

  return (
    <div className="mx-auto mt-30 flex w-[90%] max-w-5xl flex-col items-center gap-6 rounded-4xl border-2 border-white px-4 py-10 text-white sm:px-8">
      <h1 className="text-4xl font-bold sm:text-6xl">ForgeFocus</h1>

      <p className="text-sm text-gray-400">
        {status === "Idle" && "Set your planned focus duration"}
        {status === "Running" && "Focus session in progress"}
        {status === "Paused" && "Focus session paused"}
        {status === "Stopwatch Running" && "Overtime — keep going!"}
        {status === "Stopwatch Paused" && "Overtime paused"}
        {status === "Complete" && "Session completed. Well done!"}
        {status === "Discard" && "Session discarded"}
      </p>

      <div className="whitespace-nowrap font-extrabold text-[clamp(2rem,10vw,8rem)]">
        {isIdle ? (
          <div className="flex items-center justify-center">
            <TimeInput
              label="Hours"
              value={hours}
              onChange={setHours}
              max={99}
            />
            <span>:</span>
            <TimeInput
              label="Minutes"
              value={minutes}
              onChange={setMinutes}
              max={59}
            />
            <span>:</span>
            <TimeInput
              label="Seconds"
              value={seconds}
              onChange={setSeconds}
              max={59}
            />
          </div>
        ) : (
          <div className="text-center">
            {status.startsWith("Stopwatch") ? `+${displayTime}` : displayTime}
          </div>
        )}
      </div>

      {status === "Complete" && session && (
        <div className="text-center">
          <p className="text-lg font-semibold">
            Total focus time: {formatTime(session.totalFocusTime ?? 0)}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Planned: {formatTime(session.plannedDuration)}
          </p>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {isIdle && (
          <button
            onClick={() => timer.start(selectedSeconds)}
            disabled={selectedSeconds <= 0}
            className="rounded-xl bg-white px-6 py-3 font-semibold text-black disabled:opacity-40"
          >
            Start Focus
          </button>
        )}

        {(status === "Running" || status === "Stopwatch Running") && (
          <button
            onClick={timer.pause}
            className="rounded-xl bg-white px-6 py-3 font-semibold text-black"
          >
            Pause
          </button>
        )}

        {(status === "Paused" || status === "Stopwatch Paused") && (
          <button
            onClick={timer.resume}
            className="rounded-xl bg-white px-6 py-3 font-semibold text-black"
          >
            Resume
          </button>
        )}

        {isActive && (
          <>
            <button
              onClick={() => timer.complete()}
              className="rounded-xl border border-white px-6 py-3 font-semibold"
            >
              Finish Session
            </button>

            <button
              onClick={() => {
                if (window.confirm("Discard this focus session?")) {
                  timer.discard();
                }
              }}
              className="rounded-xl border border-red-400 px-6 py-3 font-semibold text-red-300"
            >
              Discard
            </button>
          </>
        )}

        {(status === "Complete" || status === "Discard") && (
          <button
            onClick={timer.reset}
            className="rounded-xl bg-white px-6 py-3 font-semibold text-black"
          >
            New Session
          </button>
        )}
      </div>
    </div>
  );
}
