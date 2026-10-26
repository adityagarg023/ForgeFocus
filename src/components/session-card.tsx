"use client";

import { useEffect, useState } from "react";
import type { CompletedSession } from "@/lib/use-timer-engine";
import { formatTime } from "@/lib/timer-engine";

interface Props {
  session: CompletedSession;
  onEditNotes: (sessionId: string, currentNotes: string) => void;
  onDelete: (sessionId: string) => void;
  index: number;
}

export default function SessionCard({
  session,
  onEditNotes,
  onDelete,
  index,
}: Props) {
  const completedDate = new Date(session.completedAt);
  const timeLabel = completedDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasOvertime = session.overtimeMs > 0;

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-[#30363d] bg-[#161b22] p-5 transition-colors hover:border-[#2f81f7]/40"
      style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-[#6e7681]">
            <span>{timeLabel}</span>
            {hasOvertime && (
              <span className="rounded-full bg-[#d29922]/10 px-2 py-0.5 text-[#d29922]">
                +{formatTime(session.overtimeMs)} overtime
              </span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[#6e7681]">Planned</div>
              <div className="font-semibold text-[#e6edf3]">
                {formatTime(session.plannedDuration)}
              </div>
            </div>
            <div>
              <div className="text-[#6e7681]">Focused</div>
              <div className="font-semibold text-[#3fb950]">
                {formatTime(session.totalFocusTime)}
              </div>
            </div>
          </div>
          {session.notes && (
            <p className="mt-3 truncate text-sm text-[#8b949e]">
              {session.notes}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => onEditNotes(session.sessionId, session.notes ?? "")}
            className="rounded-lg border border-[#30363d] px-3 py-1.5 text-xs text-[#8b949e] transition-colors hover:border-[#2f81f7] hover:text-[#e6edf3]"
            aria-label="Edit notes"
          >
            Notes
          </button>
          <button
            onClick={() => onDelete(session.sessionId)}
            className="rounded-lg border border-[#30363d] px-3 py-1.5 text-xs text-[#8b949e] transition-colors hover:border-[#f85149] hover:text-[#f85149]"
            aria-label="Delete session"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotesModal({
  sessionId,
  initialNotes,
  onSave,
  onClose,
}: {
  sessionId: string;
  initialNotes: string;
  onSave: (sessionId: string, notes: string) => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="animate-scale-in w-full max-w-md rounded-2xl border border-[#30363d] bg-[#1c2128] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">Session Notes</h2>
        <p className="mt-1 text-sm text-[#6e7681]">
          What did you accomplish?
        </p>
        <textarea
          autoFocus
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Built the auth flow, fixed the timer bug, reviewed PRs..."
          className="mt-4 w-full resize-none rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-sm text-[#e6edf3] placeholder:text-[#6e7681] focus:border-[#2f81f7]"
        />
        <div className="mt-1 text-right text-xs text-[#6e7681]">
          {notes.length}/500
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#30363d] px-5 py-2.5 text-sm font-semibold text-[#8b949e] transition-colors hover:text-[#e6edf3]"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(sessionId, notes.trim());
              onClose();
            }}
            className="rounded-xl bg-[#2f81f7] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1f6feb]"
          >
            Save Notes
          </button>
        </div>
      </div>
    </div>
  );
}
