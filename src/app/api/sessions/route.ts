import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { dbRowToSession } from "@/lib/session-types";
import { createSessionSchema } from "@/lib/session-schemas";

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
      .select(selectedColumns)
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

    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid session data", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const {
      sessionId,
      status,
      plannedDuration,
      totalFocusTime,
      overtimeMs,
      startedAt,
      completedAt,
      notes,
    } = parsed.data;

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
    const selectedColumns =
      "id, session_id, status, planned_duration_ms, total_focus_time_ms, overtime_ms, started_at, completed_at, notes";

    // Make client retries idempotent for the same authenticated owner.
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("sessions")
      .select(selectedColumns)
      .eq("clerk_user_id", clerkUserId)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existingError) {
      console.error("sessions POST idempotency check failed", existingError);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
    if (existing) {
      return NextResponse.json({ session: dbRowToSession(existing) }, { status: 200 });
    }

    const { data, error: insertError } = await supabaseAdmin
      .from("sessions")
      .insert(row)
      .select(
        "id, session_id, status, planned_duration_ms, total_focus_time_ms, overtime_ms, started_at, completed_at, notes",
      )
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        // Another retry may have won the insert race. Only return a row
        // belonging to this authenticated user.
        const { data: duplicate } = await supabaseAdmin
          .from("sessions")
          .select(selectedColumns)
          .eq("clerk_user_id", clerkUserId)
          .eq("session_id", sessionId)
          .maybeSingle();
        if (duplicate) {
          return NextResponse.json({ session: dbRowToSession(duplicate) }, { status: 200 });
        }
        return NextResponse.json({ error: "Session ID conflict" }, { status: 409 });
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
