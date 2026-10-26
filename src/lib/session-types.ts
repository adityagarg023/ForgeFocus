/**
 * Shared types for session data exchanged between client and server.
 *
 * These types bridge the existing localStorage-based CompletedSession
 * and the database sessions table. The client API layer converts
 * between these and the frontend's CompletedSession format.
 */

export interface SessionRecord {
  id: string;
  sessionId: string;
  status: "Complete" | "Discard";
  plannedDuration: number;
  totalFocusTime: number;
  overtimeMs: number;
  startedAt: number;
  completedAt: number;
  notes: string | null;
}

export interface CreateSessionInput {
  sessionId: string;
  status: "Complete" | "Discard";
  plannedDuration: number;
  totalFocusTime: number;
  overtimeMs: number;
  startedAt: number;
  completedAt: number;
  notes: string | null;
}

export interface UpdateSessionInput {
  notes?: string | null;
}

/**
 * Converts a database row (snake_case, ISO timestamps, bigint ms)
 * to a SessionRecord (camelCase, epoch ms, number).
 */
export function dbRowToSession(row: {
  id: string;
  session_id: string;
  status: string;
  planned_duration_ms: number;
  total_focus_time_ms: number;
  overtime_ms: number;
  started_at: string;
  completed_at: string;
  notes: string | null;
}): SessionRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    status: row.status as "Complete" | "Discard",
    plannedDuration: Number(row.planned_duration_ms),
    totalFocusTime: Number(row.total_focus_time_ms),
    overtimeMs: Number(row.overtime_ms),
    startedAt: new Date(row.started_at).getTime(),
    completedAt: new Date(row.completed_at).getTime(),
    notes: row.notes,
  };
}

/**
 * Converts a CreateSessionInput (epoch ms) to a database row
 * (ISO timestamps, bigint ms).
 */
export function sessionInputToDbRow(input: CreateSessionInput) {
  return {
    session_id: input.sessionId,
    status: input.status,
    planned_duration_ms: input.plannedDuration,
    total_focus_time_ms: input.totalFocusTime,
    overtime_ms: input.overtimeMs,
    started_at: new Date(input.startedAt).toISOString(),
    completed_at: new Date(input.completedAt).toISOString(),
    notes: input.notes,
  };
}
