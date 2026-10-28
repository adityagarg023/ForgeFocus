import type {
  SessionRecord,
  CreateSessionInput,
  UpdateSessionInput,
} from "@/lib/session-types";

/**
 * Client-side API layer for session persistence.
 *
 * All requests go through Next.js route handlers (/api/sessions),
 * which verify Clerk identity server-side and enforce ownership.
 * The browser never talks to the database directly and never
 * supplies a user ID.
 *
 * Every method returns a typed result or throws an Error with a
 * user-safe message. Server error details are logged server-side
 * and never exposed to the client.
 */

export class SessionsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "SessionsApiError";
  }
}

async function parseResponse(response: Response) {
  if (!response.ok) {
    let message = "Request failed";
    try {
      const body = await response.json();
      if (typeof body.error === "string") message = body.error;
    } catch {
      // non-JSON error body — keep generic message
    }
    throw new SessionsApiError(message, response.status);
  }
  return response.json();
}

export const sessionsApi = {
  async list(signal?: AbortSignal): Promise<SessionRecord[]> {
    const response = await fetch("/api/sessions", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal,
    });
    const data = await parseResponse(response);
    return data.sessions as SessionRecord[];
  },

  async create(input: CreateSessionInput): Promise<SessionRecord> {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await parseResponse(response);
    return data.session as SessionRecord;
  },

  async update(sessionId: string, input: UpdateSessionInput): Promise<void> {
    const response = await fetch(
      `/api/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    await parseResponse(response);
  },

  async delete(sessionId: string): Promise<void> {
    const response = await fetch(
      `/api/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      },
    );
    await parseResponse(response);
  },
};
