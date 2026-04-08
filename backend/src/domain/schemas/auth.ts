import { z } from 'zod';

export const SetupPasswordSchema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
