/**
 * Zod schemas for auth forms + server actions.
 *
 * Kept intentionally small — stricter rules (password complexity, reserved
 * email domains, etc.) should be added here and will auto-apply to both
 * client-side form validation and server-side action validation.
 */

import { z } from "zod";

// --- Primitives -------------------------------------------------------------

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

// --- Forms ------------------------------------------------------------------

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Your name is required")
    .max(120, "Name is too long"),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const portalCodeRequestSchema = z.object({
  email: emailSchema,
});

export const portalCodeVerifySchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6,8}$/, "Enter the code from your email"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// --- Inferred types ---------------------------------------------------------

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PortalCodeRequestInput = z.infer<typeof portalCodeRequestSchema>;
export type PortalCodeVerifyInput = z.infer<typeof portalCodeVerifySchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
