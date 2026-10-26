import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * Verifies the current request is authenticated via Clerk and returns
 * the caller's Clerk user ID.
 *
 * This function is the single source of truth for user identity on the
 * server. Route handlers call it to derive clerk_user_id for every
 * database query. The client never supplies a user ID — it is always
 * taken from the verified Clerk session.
 *
 * Returns null if the request is unauthenticated. Route handlers
 * respond with 401 in that case.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

/**
 * Verifies the current request is authenticated and throws a
 * structured error if not. Use in route handlers that need to fail
 * fast with a 401.
 *
 * Returns the Clerk user ID on success.
 */
export async function requireAuth(): Promise<string> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new AuthError("Unauthorized", 401);
  }
  return userId;
}

/**
 * Fetches the Clerk user's email address. Used to verify the user
 * exists and is active. Returns null if no email is found.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.primaryEmailAddress?.emailAddress ?? null;
  } catch {
    return null;
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
