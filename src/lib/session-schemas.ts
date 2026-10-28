import { z } from "zod";

const epochMs = z.number().finite().int().positive();
const durationMs = z.number().finite().int().nonnegative();

export const createSessionSchema = z
  .object({
    sessionId: z.string().trim().min(1).max(128),
    status: z.enum(["Complete", "Discard"]),
    plannedDuration: z
      .number()
      .finite()
      .int()
      .positive()
      .max(99 * 60 * 60 * 1000),
    totalFocusTime: durationMs,
    overtimeMs: durationMs,
    startedAt: epochMs,
    completedAt: epochMs,
    notes: z.string().max(500).nullable(),
  })
  .strict()
  .refine((value) => value.completedAt >= value.startedAt, {
    message: "completedAt must be on or after startedAt",
    path: ["completedAt"],
  })
  .refine((value) => value.overtimeMs <= value.totalFocusTime, {
    message: "overtimeMs cannot exceed totalFocusTime",
    path: ["overtimeMs"],
  });

export const updateSessionSchema = z
  .object({
    notes: z.string().max(500).nullable().optional(),
  })
  .strict()
  .refine((value) => value.notes !== undefined, {
    message: "Provide notes to update",
  });

export const sessionIdSchema = z.string().trim().min(1).max(128);
