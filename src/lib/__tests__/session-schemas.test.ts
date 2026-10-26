import { describe, expect, it } from "vitest";
import {
  createSessionSchema,
  sessionIdSchema,
  updateSessionSchema,
} from "@/lib/session-schemas";

const validSession = {
  sessionId: "session-1",
  status: "Complete" as const,
  plannedDuration: 60_000,
  totalFocusTime: 65_000,
  overtimeMs: 5_000,
  startedAt: 1_000,
  completedAt: 66_000,
  notes: "Read docs",
};

describe("createSessionSchema", () => {
  it("accepts valid session input", () => {
    expect(createSessionSchema.safeParse(validSession).success).toBe(true);
  });

  it("rejects unknown properties", () => {
    expect(createSessionSchema.safeParse({ ...validSession, clerkUserId: "user_other" }).success).toBe(false);
  });

  it("rejects invalid duration, timestamps, and oversized notes", () => {
    expect(createSessionSchema.safeParse({ ...validSession, plannedDuration: -1 }).success).toBe(false);
    expect(createSessionSchema.safeParse({ ...validSession, completedAt: 999 }).success).toBe(false);
    expect(createSessionSchema.safeParse({ ...validSession, notes: "x".repeat(501) }).success).toBe(false);
  });

  it("rejects overtime greater than total focus time", () => {
    expect(createSessionSchema.safeParse({ ...validSession, overtimeMs: 70_000 }).success).toBe(false);
  });
});

describe("updateSessionSchema", () => {
  it("accepts notes and null", () => {
    expect(updateSessionSchema.safeParse({ notes: "Done" }).success).toBe(true);
    expect(updateSessionSchema.safeParse({ notes: null }).success).toBe(true);
  });

  it("rejects empty updates and unknown properties", () => {
    expect(updateSessionSchema.safeParse({}).success).toBe(false);
    expect(updateSessionSchema.safeParse({ notes: "x", userId: "someone" }).success).toBe(false);
  });
});

describe("sessionIdSchema", () => {
  it("rejects blank and oversized identifiers", () => {
    expect(sessionIdSchema.safeParse(" ").success).toBe(false);
    expect(sessionIdSchema.safeParse("x".repeat(129)).success).toBe(false);
  });
});
