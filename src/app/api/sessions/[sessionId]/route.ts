import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, AuthError } from "@/lib/auth-server";

/**
 * PATCH /api/sessions/[sessionId]
 *
 * Updates notes for a specific session. Only the session owner
 * (identified by the verified Clerk session) can update their own
 * sessions. The clerk_user_id filter ensures cross-user access is
 * blocked at the database query level.
 *
 * Authorization: Clerk session required. 401 if unauthenticated.
 * Ownership: enforced by filtering on clerk_user_id in the query.
 *             404 if the session doesn't exist or belongs to another user.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const clerkUserId = await requireAuth();
    const { sessionId } = await params;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const updates: { notes?: string | null } = {};
    if (body.notes !== undefined) {
      if (body.notes !== null && typeof body.notes !== "string") {
        return NextResponse.json(
          { error: "notes must be a string or null" },
          { status: 400 },
        );
      }
      if (typeof body.notes === "string" && body.notes.length > 500) {
        return NextResponse.json(
          { error: "notes must be 500 characters or fewer" },
          { status: 400 },
        );
      }
      updates.notes = body.notes as string | null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Filter by BOTH clerk_user_id AND session_id so a user can only
    // update their own sessions. If the session belongs to another user,
    // the query returns zero rows → 404 (not 403, to avoid leaking existence).
    const { error: updateError } = await supabaseAdmin
      .from("sessions")
      .update(updates)
      .eq("clerk_user_id", clerkUserId)
      .eq("session_id", sessionId);

    if (updateError) {
      console.error("sessions PATCH update failed", updateError);
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 },
      );
    }

    // Verify the update affected a row. If not, either the session
    // doesn't exist or it belongs to another user — both return 404.
    const { data: checkData, error: checkError } = await supabaseAdmin
      .from("sessions")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (checkError) {
      console.error("sessions PATCH check failed", checkError);
      return NextResponse.json(
        { error: "Failed to verify update" },
        { status: 500 },
      );
    }

    if (!checkData) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }
    console.error("sessions PATCH unexpected error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/sessions/[sessionId]
 *
 * Deletes a specific session. Only the session owner can delete
 * their own sessions. Cross-user deletion is blocked by the
 * clerk_user_id filter.
 *
 * Authorization: Clerk session required. 401 if unauthenticated.
 * Ownership: enforced by filtering on clerk_user_id in the query.
 *             404 if the session doesn't exist or belongs to another user.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const clerkUserId = await requireAuth();
    const { sessionId } = await params;

    const supabaseAdmin = getSupabaseAdmin();
    const { count, error: deleteError } = await supabaseAdmin
      .from("sessions")
      .delete({ count: "exact" })
      .eq("clerk_user_id", clerkUserId)
      .eq("session_id", sessionId);

    if (deleteError) {
      console.error("sessions DELETE failed", deleteError);
      return NextResponse.json(
        { error: "Failed to delete session" },
        { status: 500 },
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode },
      );
    }
    console.error("sessions DELETE unexpected error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
