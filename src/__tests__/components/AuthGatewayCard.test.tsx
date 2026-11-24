// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  mockPush,
  mockRefresh,
  mockRequestEmailSignIn,
  mockVerifyEmailOtp,
  mockSignIn,
  mockRequestReset,
  mockResendVerify,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  mockRequestEmailSignIn: vi.fn(),
  mockVerifyEmailOtp: vi.fn(),
  mockSignIn: vi.fn(),
  mockRequestReset: vi.fn(),
  mockResendVerify: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("@/wellness/actions/locale", () => ({
  wellnessSetLocale: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/wellness/actions/auth", () => ({
  wellnessRequestEmailSignIn: mockRequestEmailSignIn,
  wellnessVerifyEmailOtp: mockVerifyEmailOtp,
  wellnessSignIn: mockSignIn,
  wellnessRequestPasswordReset: mockRequestReset,
  wellnessResendVerificationEmail: mockResendVerify,
}));

import { LocaleProvider } from "@/wellness/i18n/LocaleContext";
import { AuthGatewayCard } from "@/components/auth/AuthModal";

function renderAuthCard(props: Parameters<typeof AuthGatewayCard>[0] = {}) {
  return render(
    <LocaleProvider initialLocale="en">
      <AuthGatewayCard {...props} />
    </LocaleProvider>
  );
}

describe("UI Component: AuthGatewayCard (Passwordless Email OTP + Google + Password Fallback)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows ONLY 'Sign in with Email' and 'Sign in with Google' initially, and displays URL authError", () => {
    window.history.replaceState({}, "", "/?authError=account_suspended");
    renderAuthCard({ contextProgramTitle: "21-Day Somatic Reset" });

    expect(screen.getByText("21-Day Somatic Reset")).toBeInTheDocument();
    expect(screen.getByText(/this account is suspended/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in with email/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in with google/i })).toHaveAttribute(
      "href",
      "/api/auth/google"
    );
    expect(screen.getByText(/by signing up or continuing, you agree/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /terms of service/i })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute("href", "/privacy");
    expect(screen.queryByPlaceholderText(/enter your email/i)).not.toBeInTheDocument();
  });

  it("sends 6-digit email verification code and routes new users to /onboarding", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    mockRequestEmailSignIn.mockResolvedValueOnce({
      success: true,
      message: "Verification code sent!",
      data: { email: "newbie@zera.id" },
      devOtpCode: "482910",
    });
    mockVerifyEmailOtp.mockResolvedValueOnce({
      success: true,
      data: {
        id: "u_new",
        email: "newbie@zera.id",
        fullName: "",
        role: "USER",
        needsOnboarding: true,
      },
    });

    renderAuthCard({ isModal: true, onClose });

    await user.click(screen.getByRole("button", { name: /sign in with email/i }));
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    await user.type(emailInput, "newbie@zera.id");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(mockRequestEmailSignIn).toHaveBeenCalledWith({ email: "newbie@zera.id" });
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();

    // Enter all 6 OTP digits (auto-submits on 6th digit)
    const digit1 = screen.getByLabelText("Digit 1");
    await user.type(digit1, "482910");

    await waitFor(() => {
      expect(mockVerifyEmailOtp).toHaveBeenCalledWith({
        email: "newbie@zera.id",
        code: "482910",
      });
    });

    await waitFor(
      () => {
        expect(onClose).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/onboarding");
        expect(mockRefresh).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  it("supports password fallback for existing/admin accounts and unverified email resend", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    mockSignIn.mockResolvedValueOnce({
      success: false,
      requiresVerification: true,
      message: "Please verify your email first.",
    });
    mockResendVerify.mockResolvedValueOnce({
      success: true,
      message: "Verification email resent.",
    });

    renderAuthCard({ isModal: true, onClose });

    await user.click(screen.getByRole("button", { name: /sign in with email/i }));
    await user.click(screen.getByRole("button", { name: /use password instead/i }));

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    await user.type(emailInput, "steven@gmail.com");
    await user.type(passwordInput, "P@ssw0rd");

    const signInBtn = screen.getByRole("button", { name: /^sign in$/i });
    await user.click(signInBtn);

    expect(mockSignIn).toHaveBeenCalledWith({
      email: "steven@gmail.com",
      password: "P@ssw0rd",
    });
    expect(await screen.findByText(/please verify your email first/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /resend verification/i }));
    expect(mockResendVerify).toHaveBeenCalledWith("steven@gmail.com");
    expect(await screen.findByText(/verification email resent/i)).toBeInTheDocument();

    // Now test SUPERADMIN login -> redirects to /admin
    mockSignIn.mockResolvedValueOnce({
      success: true,
      data: { id: "admin_1", email: "superadmin@wellness.test", fullName: "Admin", role: "SUPERADMIN", needsOnboarding: false },
    });

    await user.click(signInBtn);
    await waitFor(
      () => {
        expect(onClose).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/admin");
        expect(mockRefresh).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });
});
