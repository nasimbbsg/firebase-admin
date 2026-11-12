import { z } from "zod";

export const createTestSchema = z
  .object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    status: z.enum(["pending", "passed", "failed"]).default("pending"),
  })
  .strict();

export type CreateTestInput = z.infer<typeof createTestSchema>;
