import { z } from "zod";

export const loginSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
  })
  .strict();

export type Login = z.infer<typeof loginSchema>;
