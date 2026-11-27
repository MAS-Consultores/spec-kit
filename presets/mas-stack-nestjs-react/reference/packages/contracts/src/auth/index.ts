import { z } from "zod";

const MIN_PASSWORD_LENGTH = 8;

export const loginSchema = z
  .object({
    email: z.email(),
    password: z.string().min(MIN_PASSWORD_LENGTH),
  })
  .strict();

export type Login = z.infer<typeof loginSchema>;
