"use client";

import { useState } from "react";
import { useSessions, isToday } from "@/lib/use-sessions";
import { formatTime } from "@/lib/timer-engine";
import SessionCard, { NotesModal } from "@/components/session-card";

export default function HistoryPage() {
  const { sessions, hydrated, error, refresh, removeSession, updateNotes } =
    useSessions();
  const [editing, setEditing] = useState<{
    sessionId: string;
    notes: string;
  } | null>(null);
  const [filter, setFilter] = useState<"all" | "today">("all");

  const filtered =
    filter === "today"
      ? sessions.filter((s) => isToday(s.completedAt))
      : sessions;

  const totalFocusMs = filtered.reduce((sum, s) => sum + s.totalFocusTime, 0);

  return (
    <main className="mx-auto w-[90%] max-w-5xl py-12 pb-20">
      <h1 className="text-3xl font-bold sm:text-4xl">Session History</h1>
      <p className="mt-2 text-sm text-[#6e7681]">
        {hydrated
          ? `${filtered.length} session${filtered.length === 1 ? "" : "s"} · ${formatTime(totalFocusMs)} total focus`
          : "Loading..."}
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f85149]/30 bg-[#f85149]/10 px-4 py-3 text-sm text-[#f85149]"
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

      <div className="mt-6 inline-flex rounded-xl border border-[#30363d] bg-[#161b22] p-1">
        <button
          onClick={() => setFilter("today")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            filter === "today"
              ? "bg-[#2f81f7] text-white"
              : "text-[#8b949e] hover:text-[#e6edf3]"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            filter === "all"
              ? "bg-[#2f81f7] text-white"
              : "text-[#8b949e] hover:text-[#e6edf3]"
          }`}
        >
          All Time
        </button>
      </div>

      <div className="mt-8">
        {!hydrated && (
          <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-8 text-center text-[#6e7681]">
            Loading sessions...
          </div>
        )}

        {hydrated && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#30363d] bg-[#161b22]/50 p-12 text-center">
            <p className="text-sm text-[#6e7681]">
              No sessions to show yet. Complete a focus session to build your
              history.
            </p>
          </div>
        )}

        {hydrated && !error && filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((session, index) => (
              <SessionCard
                key={session.sessionId}
                session={session}
                index={index}
                onEditNotes={(id, notes) =>
                  setEditing({ sessionId: id, notes })
                }
                onDelete={removeSession}
              />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <NotesModal
          sessionId={editing.sessionId}
          initialNotes={editing.notes}
          onSave={updateNotes}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}
