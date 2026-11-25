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

  it("enforces mandatory Email OTP (no password bypass button) and routes Superadmin stevenmultz@gmail.com to /admin", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    mockRequestEmailSignIn.mockResolvedValueOnce({
      success: true,
      message: "Verification code sent!",
      data: { email: "stevenmultz@gmail.com" },
      devOtpCode: "918273",
    });
    mockVerifyEmailOtp.mockResolvedValueOnce({
      success: true,
      data: {
        id: "admin_1",
        email: "stevenmultz@gmail.com",
        fullName: "Super Administrator Wellness",
        role: "SUPERADMIN",
        needsOnboarding: false,
      },
    });

    renderAuthCard({ isModal: true, onClose });

    await user.click(screen.getByRole("button", { name: /sign in with email/i }));
    expect(screen.queryByRole("button", { name: /use password instead/i })).not.toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    await user.type(emailInput, "stevenmultz@gmail.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(mockRequestEmailSignIn).toHaveBeenCalledWith({ email: "stevenmultz@gmail.com" });
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();

    const digit1 = screen.getByLabelText("Digit 1");
    await user.type(digit1, "918273");

    await waitFor(() => {
      expect(mockVerifyEmailOtp).toHaveBeenCalledWith({
        email: "stevenmultz@gmail.com",
        code: "918273",
      });
    });

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
