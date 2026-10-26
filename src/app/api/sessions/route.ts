import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { dbRowToSession } from "@/lib/session-types";

/**
 * GET /api/sessions
 *
 * Returns all sessions for the authenticated Clerk user.
 * The clerk_user_id is derived from the verified Clerk session —
 * never from the request body or query params.
 *
 * Authorization: Clerk session required. 401 if unauthenticated.
 */
export async function GET() {
  try {
    const clerkUserId = await requireAuth();

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("sessions")
      .select(
        "id, session_id, status, planned_duration_ms, total_focus_time_ms, overtime_ms, started_at, completed_at, notes",
      )
      .eq("clerk_user_id", clerkUserId)
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("sessions GET query failed", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 },
      );
    }

    const sessions = (data ?? []).map(dbRowToSession);
    return NextResponse.json({ sessions });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }
    console.error("sessions GET unexpected error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/sessions
 *
 * Creates a new session for the authenticated Clerk user.
 * The clerk_user_id is set from the verified Clerk session —
 * never from the request body.
 *
 * Authorization: Clerk session required. 401 if unauthenticated.
 */
export async function POST(request: NextRequest) {
  try {
    const clerkUserId = await requireAuth();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
    const status = typeof body.status === "string" ? body.status : null;
    const plannedDuration = Number(body.plannedDuration);
    const totalFocusTime = Number(body.totalFocusTime);
    const overtimeMs = body.overtimeMs !== undefined ? Number(body.overtimeMs) : 0;
    const startedAt = Number(body.startedAt);
    const completedAt = Number(body.completedAt);
    const notes =
      typeof body.notes === "string" || body.notes === null
        ? (body.notes as string | null)
        : null;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 },
      );
    }
    if (!status || !["Complete", "Discard"].includes(status)) {
      return NextResponse.json(
        { error: "status must be Complete or Discard" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(plannedDuration) || plannedDuration < 0) {
      return NextResponse.json(
        { error: "plannedDuration must be a non-negative number" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(totalFocusTime) || totalFocusTime < 0) {
      return NextResponse.json(
        { error: "totalFocusTime must be a non-negative number" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(overtimeMs) || overtimeMs < 0) {
      return NextResponse.json(
        { error: "overtimeMs must be a non-negative number" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      return NextResponse.json(
        { error: "startedAt must be a positive epoch millisecond value" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(completedAt) || completedAt <= 0) {
      return NextResponse.json(
        { error: "completedAt must be a positive epoch millisecond value" },
        { status: 400 },
      );
    }
    if (notes !== null && notes.length > 500) {
      return NextResponse.json(
        { error: "notes must be 500 characters or fewer" },
        { status: 400 },
      );
    }

    const row = {
      clerk_user_id: clerkUserId,
      session_id: sessionId,
      status,
      planned_duration_ms: plannedDuration,
      total_focus_time_ms: totalFocusTime,
      overtime_ms: overtimeMs,
      started_at: new Date(startedAt).toISOString(),
      completed_at: new Date(completedAt).toISOString(),
      notes,
    };

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error: insertError } = await supabaseAdmin
      .from("sessions")
      .insert(row)
      .select(
        "id, session_id, status, planned_duration_ms, total_focus_time_ms, overtime_ms, started_at, completed_at, notes",
      )
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "A session with this ID already exists" },
          { status: 409 },
        );
      }
      console.error("sessions POST insert failed", insertError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 },
      );
    }

    return NextResponse.json({ session: dbRowToSession(data) }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }
    console.error("sessions POST unexpected error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
