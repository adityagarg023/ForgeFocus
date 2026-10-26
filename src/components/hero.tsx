"use client";

import { useSessions } from "@/lib/use-sessions";
import { formatTime } from "@/lib/timer-engine";

export default function Hero() {
  const { todayCount, todayFocusMs, hydrated } = useSessions();

  return (
    <section className="mx-auto w-[90%] max-w-5xl pt-16 pb-8 text-center sm:pt-24">
      <div className="animate-fade-in-up">
        <span className="inline-block rounded-full border border-[#30363d] bg-[#161b22] px-4 py-1.5 text-xs text-[#8b949e] sm:text-sm">
          Deep Work Tracker
        </span>
        <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-6xl">
          Focus deeply.
          <br />
          <span className="bg-gradient-to-r from-[#2f81f7] to-[#3fb950] bg-clip-text text-transparent">
            Track honestly.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-sm text-[#8b949e] sm:text-base">
          Plan a focus session, let the timer hold you accountable, and review
          what you actually accomplished. Paused time never counts.
        </p>
      </div>

      <div className="mx-auto mt-10 flex max-w-md gap-4">
        <StatCard
          label="Sessions Today"
          value={hydrated ? String(todayCount) : "—"}
        />
        <StatCard
          label="Focus Time Today"
          value={hydrated ? formatTime(todayFocusMs) : "—"}
        />
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-[#30363d] bg-[#161b22] px-5 py-4">
      <div className="text-2xl font-bold sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs text-[#6e7681] sm:text-sm">{label}</div>
    </div>
  );
}
