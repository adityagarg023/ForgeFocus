"use client";

import { useState } from "react";
import { useSessions } from "@/lib/use-sessions";
import { formatTime } from "@/lib/timer-engine";
import SessionCard, { NotesModal } from "./session-card";

export default function SessionList() {
  const {
    todaySessions,
    todayCount,
    todayFocusMs,
    hydrated,
    error,
    refresh,
    removeSession,
    updateNotes,
  } = useSessions();
  const [editing, setEditing] = useState<{
    sessionId: string;
    notes: string;
  } | null>(null);

  return (
    <section className="mx-auto w-[90%] max-w-5xl py-12">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">
            Today&apos;s Sessions
          </h2>
          <p className="mt-1 text-sm text-[#6e7681]">
            {hydrated
              ? `${todayCount} session${todayCount === 1 ? "" : "s"} · ${formatTime(todayFocusMs)} focused`
              : "Loading..."}
          </p>
        </div>
      </div>

      {hydrated && error && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f85149]/30 bg-[#f85149]/10 px-4 py-3 text-sm text-[#f85149]"
        >
          <span>{error}</span>
          <button
            onClick={() => void refresh()}
            className="rounded-lg border border-[#f85149]/40 px-3 py-1.5 font-semibold hover:bg-[#f85149]/10"
          >
            Retry
          </button>
        </div>
      )}

      {!hydrated && (
        <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-8 text-center text-[#6e7681]">
          Loading sessions...
        </div>
      )}

      {hydrated && !error && todaySessions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#30363d] bg-[#161b22]/50 p-12 text-center">
          <div className="text-4xl font-bold text-[#30363d]">00:00:00</div>
          <p className="mt-4 text-sm text-[#6e7681]">
            No sessions yet today. Start your first focus session above.
          </p>
        </div>
      )}

      {hydrated && !error && todaySessions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {todaySessions.map((session, index) => (
            <SessionCard
              key={session.sessionId}
              session={session}
              index={index}
              onEditNotes={(id, notes) => setEditing({ sessionId: id, notes })}
              onDelete={removeSession}
            />
          ))}
        </div>
      )}

      {editing && (
        <NotesModal
          sessionId={editing.sessionId}
          initialNotes={editing.notes}
          onSave={updateNotes}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
