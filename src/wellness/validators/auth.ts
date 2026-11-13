import { z } from "zod";
import { isSafePhotoUrl } from "../utils/url-safety";

const SafePhotoUrlField = z
  .string()
  .refine((val) => isSafePhotoUrl(val), "Invalid photo URL format")
  .nullable()
  .optional();

export const SignUpSchema = z.object({
  fullName: z
    .string({ required_error: "Full name is required" })
    .min(3, "Full name must be at least 3 characters")
    .max(60, "Full name cannot exceed 60 characters")
    .trim(),
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format")
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .regex(/^[0-9+\s\-]*$/, "Phone number may only contain digits, +, spaces, or hyphens")
    .min(10, "Phone number must be at least 10 digits")
    .max(18, "Phone number cannot exceed 18 digits")
    .optional()
    .or(z.literal("")),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number"),
});

export const SignInSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format")
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password cannot be empty"),
});

export const ForgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format")
    .toLowerCase()
    .trim(),
});

export const ResetPasswordSchema = z
  .object({
    token: z.string({ required_error: "Reset token is missing" }).min(1),
    newPassword: z
      .string({ required_error: "New password is required" })
      .min(8, "New password must be at least 8 characters")
      .regex(/[A-Z]/, "New password must contain at least 1 uppercase letter")
      .regex(/[0-9]/, "New password must contain at least 1 number"),
    confirmPassword: z.string({ required_error: "Password confirmation is required" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Password confirmation does not match new password",
    path: ["confirmPassword"],
  });

/** Whole years between a YYYY-MM-DD birth date and `now` (UTC calendar math, DOB has no time zone). */
export function calculateAgeFromDob(dob: string, now: Date = new Date()): number {
  const [y, m, d] = dob.split("-").map(Number);
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
    .string({ required_error: "Full name is required" })
    .min(3, "Full name must be at least 3 characters")
    .max(60, "Full name cannot exceed 60 characters")
    .trim(),
  phone: z
    .string()
    .regex(/^[0-9+\s\-]*$/, "Phone number may only contain digits, +, spaces, or hyphens")
    .min(10, "Phone number must be at least 10 digits")
    .max(18, "Phone number cannot exceed 18 digits")
    .optional()
    .or(z.literal("")),
  age: z.number().int().min(10).max(120).nullable().optional(),
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
      .string({ required_error: "Current password is required" })
      .min(1, "Current password is required"),
    newPassword: z
      .string({ required_error: "New password is required" })
      .min(8, "New password must be at least 8 characters")
      .regex(/[A-Z]/, "New password must contain at least 1 uppercase letter")
      .regex(/[0-9]/, "New password must contain at least 1 number"),
    confirmPassword: z.string({ required_error: "Password confirmation is required" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Password confirmation does not match new password",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

export const DeleteAccountSchema = z.object({
  password: z
    .string({ required_error: "Password is required for security verification" })
    .min(1, "Password is required"),
});

export const HealthProfileSchema = z.object({
  photoFrontUrl: SafePhotoUrlField,
  photoSideUrl: SafePhotoUrlField,
  photoBackUrl: SafePhotoUrlField,
  age: z.number().int().min(10).max(120).nullable().optional(),
  weightKg: z.number().min(20).max(300).nullable().optional(),
  heightCm: z.number().min(50).max(250).nullable().optional(),
  dietType: z.string().max(50).nullable().optional(),
  foodAllergies: z.string().max(500).nullable().optional(),
  injuriesOrConditions: z.string().max(1000).nullable().optional(),
  primaryGoal: z.string().max(500).nullable().optional(),
  waistCm: z.number().min(30).max(200).nullable().optional(),
  chestCm: z.number().min(30).max(200).nullable().optional(),
  hipsCm: z.number().min(30).max(200).nullable().optional(),
  currentMood: z.string().max(50).nullable().optional(),
  energyLevel: z.number().int().min(1).max(10).nullable().optional(),
  routineConfidence: z.number().int().min(1).max(5).nullable().optional(),
  workoutFrequency: z.string().max(50).nullable().optional(),
  averageBedtime: z.string().max(20).nullable().optional(),
  averageWakeTime: z.string().max(20).nullable().optional(),
  sleepQualityNotes: z.string().max(500).nullable().optional(),
  eatingPatterns: z.string().max(500).nullable().optional(),
});

export const AdminUpdateCustomerProfileSchema = z.object({
  userId: z.string().trim().min(1, "User ID is required").max(128),
  city: z.string().max(100).nullable().optional(),
  province: z.string().max(100).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  occupation: z.string().max(100).nullable().optional(),
  gender: z.string().max(50).nullable().optional(),
  age: z.number().int().min(10).max(120).nullable().optional(),
  emergencyContactName: z.string().max(100).nullable().optional(),
  emergencyContactPhone: z.string().max(30).nullable().optional(),
  dietType: z.string().max(50).nullable().optional(),
  heightCm: z.number().min(50).max(260).nullable().optional(),
  weightKg: z.number().min(20).max(350).nullable().optional(),
  injuriesOrConditions: z.string().max(1000).nullable().optional(),
  foodAllergies: z.string().max(500).nullable().optional(),
  primaryGoal: z.string().max(500).nullable().optional(),
  coachNotes: z.string().max(2000).nullable().optional(),
});

