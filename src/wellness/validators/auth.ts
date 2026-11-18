import { z } from "zod";

/** bcrypt silently ignores bytes beyond 72, so longer passwords are rejected rather than truncated. */
const MAX_PASSWORD_BYTES = 72;
const withinPasswordByteLimit = (v: string) => new TextEncoder().encode(v).length <= MAX_PASSWORD_BYTES;
const PASSWORD_TOO_LONG = "Password is too long (maximum 72 bytes)";

export const SignUpSchema = z.object({
  fullName: z
    .string({ error: (iss) => (iss.input === undefined ? "Full name is required" : undefined) })
    .min(3, "Full name must be at least 3 characters")
    .max(60, "Full name cannot exceed 60 characters")
    .trim(),
  email: z
    .string({ error: (iss) => (iss.input === undefined ? "Email is required" : undefined) })
    .email("Invalid email format")
    .toLowerCase()
    .trim(),
  phone: z
    .string({ error: (iss) => (iss.input === undefined ? "WhatsApp number is required" : undefined) })
    .trim()
    .regex(/^[0-9+\s\-]*$/, "Phone number may only contain digits, +, spaces, or hyphens")
    .min(10, "Phone number must be at least 10 digits")
    .max(18, "Phone number cannot exceed 18 digits"),
  password: z
    .string({ error: (iss) => (iss.input === undefined ? "Password is required" : undefined) })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number")
    .refine(withinPasswordByteLimit, PASSWORD_TOO_LONG),
});

export const SignInSchema = z.object({
  email: z
    .string({ error: (iss) => (iss.input === undefined ? "Email is required" : undefined) })
    .email("Invalid email format")
    .toLowerCase()
    .trim(),
  password: z
    .string({ error: (iss) => (iss.input === undefined ? "Password is required" : undefined) })
    .min(1, "Password cannot be empty"),
});

export const ForgotPasswordSchema = z.object({
  email: z
    .string({ error: (iss) => (iss.input === undefined ? "Email is required" : undefined) })
    .email("Invalid email format")
    .toLowerCase()
    .trim(),
});

export const ResetPasswordSchema = z
  .object({
    token: z.string({ error: (iss) => (iss.input === undefined ? "Reset token is missing" : undefined) }).min(1),
    newPassword: z
      .string({ error: (iss) => (iss.input === undefined ? "New password is required" : undefined) })
      .min(8, "New password must be at least 8 characters")
      .regex(/[A-Z]/, "New password must contain at least 1 uppercase letter")
      .regex(/[0-9]/, "New password must contain at least 1 number")
      .refine(withinPasswordByteLimit, PASSWORD_TOO_LONG),
    confirmPassword: z.string({ error: (iss) => (iss.input === undefined ? "Password confirmation is required" : undefined) }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Password confirmation does not match new password",
    path: ["confirmPassword"],
  });

/** Whole years between a YYYY-MM-DD birth date (or Date) and `now` (UTC calendar math). */
export function calculateAgeFromDob(dob: string | Date, now: Date = new Date()): number {
  const iso = dob instanceof Date ? dob.toISOString().slice(0, 10) : dob;
  const [y, m, d] = iso.split("-").map(Number);
  let age = now.getUTCFullYear() - y;
  const hadBirthday =
    now.getUTCMonth() + 1 > m || (now.getUTCMonth() + 1 === m && now.getUTCDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

const DateOfBirthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format")
  .refine((v) => {
    const [y, m, d] = v.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }, "Date of birth is not a valid date")
  .refine((v) => calculateAgeFromDob(v) >= 10, "You must be at least 10 years old")
  .refine((v) => calculateAgeFromDob(v) <= 120, "Date of birth is not realistic");

export const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"] as const;

export const UpdateProfileSchema = z.object({
  fullName: z
    .string({ error: (iss) => (iss.input === undefined ? "Full name is required" : undefined) })
    .min(3, "Full name must be at least 3 characters")
    .max(60, "Full name cannot exceed 60 characters")
    .trim(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\s\-]*$/, "Phone number may only contain digits, +, spaces, or hyphens")
    .min(10, "Phone number must be at least 10 digits")
    .max(18, "Phone number cannot exceed 18 digits")
    .optional()
    .or(z.literal("")),
  dateOfBirth: z.union([DateOfBirthSchema, z.literal("")]).nullable().optional(),
  gender: z
    .union([z.enum(GENDER_OPTIONS), z.literal("")])
    .nullable()
    .optional(),
  occupation: z.string().max(100).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  province: z.string().max(100).nullable().optional(),
  emergencyContactName: z.string().max(100).nullable().optional(),
  emergencyContactPhone: z.string().max(30).nullable().optional(),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .optional()
      .or(z.literal("")),
    newPassword: z
      .string({ error: (iss) => (iss.input === undefined ? "New password is required" : undefined) })
      .min(8, "New password must be at least 8 characters")
      .regex(/[A-Z]/, "New password must contain at least 1 uppercase letter")
      .regex(/[0-9]/, "New password must contain at least 1 number")
      .refine(withinPasswordByteLimit, PASSWORD_TOO_LONG),
    confirmPassword: z.string({ error: (iss) => (iss.input === undefined ? "Password confirmation is required" : undefined) }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Password confirmation does not match new password",
    path: ["confirmPassword"],
  })
  .refine((data) => !data.currentPassword || data.currentPassword !== data.newPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

export const DeleteAccountSchema = z.object({
  password: z
    .string()
    .min(1, "Password is required")
    .optional()
    .or(z.literal("")),
});

export const AdminUpdateCustomerProfileSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required").max(128),
  city: z.string().max(100).nullable().optional(),
  province: z.string().max(100).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  occupation: z.string().max(100).nullable().optional(),
  gender: z.string().max(50).nullable().optional(),
  emergencyContactName: z.string().max(100).nullable().optional(),
  emergencyContactPhone: z.string().max(30).nullable().optional(),
});
