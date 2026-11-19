import { describe, expect, it } from "vitest";
import {
  AdminUpdateCustomerProfileSchema,
  ChangePasswordSchema,
  CompleteOnboardingSchema,
  DeleteAccountSchema,
  EmailAuthRequestSchema,
  EmailOtpVerifySchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  SignInSchema,
  SignUpSchema,
  UpdateProfileSchema,
  calculateAgeFromDob,
  isUserOnboardingComplete,
} from "@/wellness/validators/auth";

describe("Validators: Auth & Profile Schemas", () => {
  describe("SignUpSchema", () => {
    const valid = {
      fullName: "  Budi Santoso  ",
      email: "BUDI@Example.COM",
      phone: "+62 812-3456-7890",
      password: "Password123!",
    };

    it("accepts and normalizes valid signup payloads", () => {
      const res = SignUpSchema.safeParse(valid);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.fullName).toBe("Budi Santoso");
        expect(res.data.email).toBe("budi@example.com");
      }
    });

    it("enforces password complexity and bcrypt 72-byte UTF-8 boundary", () => {
      expect(SignUpSchema.safeParse({ ...valid, password: "short1A" }).success).toBe(false);
      expect(SignUpSchema.safeParse({ ...valid, password: "nouppercase1" }).success).toBe(false);
      expect(SignUpSchema.safeParse({ ...valid, password: "NoNumberHere!" }).success).toBe(false);

      // Exactly 72 ASCII bytes passes
      const exact72 = `A1${"a".repeat(70)}`;
      expect(SignUpSchema.safeParse({ ...valid, password: exact72 }).success).toBe(true);

      // 73 ASCII bytes fails
      const over72 = `A1${"a".repeat(71)}`;
      expect(SignUpSchema.safeParse({ ...valid, password: over72 }).success).toBe(false);

      // Multi-byte UTF-8 characters (20 emojis * 4 bytes = 80 bytes > 72 bytes) fails even though char length < 72
      const emojiOver72 = `A1${"🧘".repeat(18)}`;
      expect(SignUpSchema.safeParse({ ...valid, password: emojiOver72 }).success).toBe(false);
    });

    it("rejects malformed emails, short names, and invalid phone numbers", () => {
      expect(SignUpSchema.safeParse({ ...valid, fullName: "AB" }).success).toBe(false);
      expect(SignUpSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
      expect(SignUpSchema.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
      expect(SignUpSchema.safeParse({ ...valid, phone: "0812abc67890" }).success).toBe(false);
    });
  });

  describe("SignInSchema, ForgotPasswordSchema & ResetPasswordSchema", () => {
    it("validates sign-in and forgot password inputs", () => {
      expect(SignInSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
      expect(SignInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
      expect(ForgotPasswordSchema.safeParse({ email: "USER@ZERA.ID" }).success).toBe(true);
      expect(ForgotPasswordSchema.safeParse({ email: "bad" }).success).toBe(false);
    });

    it("requires matching confirmPassword and valid token on ResetPasswordSchema", () => {
      expect(
        ResetPasswordSchema.safeParse({
          token: "tok_abc",
          newPassword: "NewPassword1!",
          confirmPassword: "NewPassword1!",
        }).success
      ).toBe(true);

      const mismatch = ResetPasswordSchema.safeParse({
        token: "tok_abc",
        newPassword: "NewPassword1!",
        confirmPassword: "DifferentPassword1!",
      });
      expect(mismatch.success).toBe(false);
    });
  });

  describe("calculateAgeFromDob", () => {
    it("accurately computes age before, on, and after birthday in UTC", () => {
      const now = new Date("2026-06-15T00:00:00Z");
      expect(calculateAgeFromDob("1996-06-16", now)).toBe(29); // day before birthday
      expect(calculateAgeFromDob("1996-06-15", now)).toBe(30); // exact birthday
      expect(calculateAgeFromDob("1996-06-14", now)).toBe(30); // day after birthday
      expect(calculateAgeFromDob(new Date("2000-02-29T00:00:00Z"), now)).toBe(26);
    });
  });

  describe("UpdateProfileSchema & AdminUpdateCustomerProfileSchema", () => {
    it("accepts valid profile updates and optional empty strings", () => {
      const res = UpdateProfileSchema.safeParse({
        fullName: "Nadia Kusuma",
        phone: "",
        dateOfBirth: "1995-05-20",
        gender: "Female",
        city: "Jakarta",
        emergencyContactPhone: "+62 (21) 555-1234",
      });
      expect(res.success).toBe(true);
    });

    it("rejects impossible calendar dates and out-of-range ages (<10 or >120)", () => {
      expect(
        UpdateProfileSchema.safeParse({
          fullName: "Nadia Kusuma",
          dateOfBirth: "2025-02-30", // impossible date
        }).success
      ).toBe(false);

      expect(
        UpdateProfileSchema.safeParse({
          fullName: "Nadia Kusuma",
          dateOfBirth: "2024-01-01", // < 10 years old
        }).success
      ).toBe(false);

      expect(
        UpdateProfileSchema.safeParse({
          fullName: "Nadia Kusuma",
          dateOfBirth: "1890-01-01", // > 120 years old
        }).success
      ).toBe(false);

      expect(
        UpdateProfileSchema.safeParse({
          fullName: "Nadia Kusuma",
          gender: "InvalidGender",
        }).success
      ).toBe(false);
    });

    it("validates AdminUpdateCustomerProfileSchema and DeleteAccountSchema", () => {
      expect(AdminUpdateCustomerProfileSchema.safeParse({ userId: "" }).success).toBe(false);
      expect(
        AdminUpdateCustomerProfileSchema.safeParse({
          userId: "user_1",
          city: "Bandung",
          gender: "Male",
        }).success
      ).toBe(true);
      expect(DeleteAccountSchema.safeParse({ password: "" }).success).toBe(true);
      expect(DeleteAccountSchema.safeParse({ password: "MyPassword1" }).success).toBe(true);
    });
  });

  describe("ChangePasswordSchema", () => {
    it("rejects reusing the same password and allows empty currentPassword for OAuth accounts", () => {
      expect(
        ChangePasswordSchema.safeParse({
          currentPassword: "SamePassword1!",
          newPassword: "SamePassword1!",
          confirmPassword: "SamePassword1!",
        }).success
      ).toBe(false);

      expect(
        ChangePasswordSchema.safeParse({
          currentPassword: "",
          newPassword: "BrandNewPassword1!",
          confirmPassword: "BrandNewPassword1!",
        }).success
      ).toBe(true);
    });
  });

  describe("Email OTP & Onboarding Schemas + isUserOnboardingComplete", () => {
    it("validates passwordless email request and 6-digit OTP code strictly", () => {
      expect(EmailAuthRequestSchema.safeParse({ email: "  STEVEN@gmail.com " }).success).toBe(true);
      expect(EmailAuthRequestSchema.safeParse({ email: "bad-email" }).success).toBe(false);
      expect(EmailOtpVerifySchema.safeParse({ email: "steven@gmail.com", code: "012345" }).success).toBe(true);
      expect(EmailOtpVerifySchema.safeParse({ email: "steven@gmail.com", code: "12345" }).success).toBe(false);
      expect(EmailOtpVerifySchema.safeParse({ email: "steven@gmail.com", code: "abcdef" }).success).toBe(false);
    });

    it("validates sequential onboarding fields and detects incomplete member profiles", () => {
      expect(
        CompleteOnboardingSchema.safeParse({
          fullName: "Steven Mulya",
          dateOfBirth: "1999-06-15",
          gender: "Male",
          phone: "+6281290001122",
          city: "Jakarta Selatan",
        }).success
      ).toBe(true);

      expect(
        CompleteOnboardingSchema.safeParse({
          fullName: "St",
          dateOfBirth: "1999-06-15",
          gender: "Male",
          phone: "+6281290001122",
          city: "Jakarta Selatan",
        }).success
      ).toBe(false);

      expect(
        isUserOnboardingComplete({
          role: "USER",
          fullName: "Steven Mulya",
          birthDate: new Date("1999-06-15T00:00:00Z"),
          gender: "Male",
          phone: "+6281290001122",
          city: "Jakarta Selatan",
        })
      ).toBe(true);

      expect(
        isUserOnboardingComplete({
          role: "USER",
          fullName: "Steven Mulya",
          birthDate: null,
          gender: null,
          phone: null,
          city: null,
        })
      ).toBe(false);

      // Staff bypass member onboarding
      expect(isUserOnboardingComplete({ role: "SUPERADMIN", fullName: "Admin" })).toBe(true);
    });
  });
});
