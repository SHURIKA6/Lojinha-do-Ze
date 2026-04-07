import { z } from 'zod';
import { SetupPasswordSchema, ChangePasswordSchema, LoginSchema } from '../schemas/auth';
import { UserSchema } from '../schemas/user';
import { ProductSchema } from '../schemas/product';

export type SetupPasswordInput = z.infer<typeof SetupPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type User = z.infer<typeof UserSchema>;
export type Product = z.infer<typeof ProductSchema>;
