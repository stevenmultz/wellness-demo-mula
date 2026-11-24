"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/common/BrandLogo";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import {
  wellnessRequestEmailSignIn,
  wellnessVerifyEmailOtp,
  wellnessSignIn,
  wellnessRequestPasswordReset,
  wellnessResendVerificationEmail,
} from "@/wellness/actions/auth";
import { isAdminRole } from "@/wellness/security/roles";
import {
  X,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Mail,
  KeyRound,
  RefreshCw,
} from "lucide-react";

export type AuthTabMode = "signin" | "signup" | "forgot";
type AuthFlowStep = "choice" | "email" | "otp" | "password" | "forgot";

interface AuthGatewayCardProps {
  initialTab?: AuthTabMode;
  activeTabOverride?: AuthTabMode;
  onTabChange?: (tab: AuthTabMode) => void;
  onClose?: () => void;
  isModal?: boolean;
  contextProgramTitle?: string | null;
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 30;

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

export function AuthGatewayCard({
  initialTab = "signin",
  activeTabOverride,
  onTabChange,
  onClose,
  isModal = false,
  contextProgramTitle = null,
}: AuthGatewayCardProps) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const isId = locale === "id";

  const [step, setStep] = useState<AuthFlowStep>(
    initialTab === "forgot" ? "forgot" : "choice"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [isResendingVerify, setIsResendingVerify] = useState(false);

  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [resendCooldown, setResendCooldown] = useState(0);
  const [password, setPassword] = useState("");
  const [peekPassword, setPeekPassword] = useState(false);

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const verifyingOtpRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const authError = new URLSearchParams(window.location.search).get("authError");
    if (!authError) return;
    const map: Record<string, string> = {
      google_not_configured: "Google Sign-In is not configured on this environment yet.",
      google_oauth_cancelled: "Google Sign-In was cancelled.",
      google_state_invalid: "Google Sign-In session expired. Please try again.",
      google_token_exchange_failed: "Could not complete Google Sign-In. Please try again.",
      google_email_unverified: "Your Google account email is not verified by Google.",
      account_suspended: "This account is suspended. Please contact support.",
    };
    setErrorMsg(map[authError] || "Google Sign-In failed. Please try again.");
  }, []);

  const prevTabOverrideRef = useRef<AuthTabMode | undefined>(activeTabOverride);
  useEffect(() => {
    if (activeTabOverride && activeTabOverride !== prevTabOverrideRef.current) {
      prevTabOverrideRef.current = activeTabOverride;
      setErrorMsg(null);
      setSuccessMsg(null);
      setDevResetUrl(null);
      setDevVerifyUrl(null);
      setDevOtpCode(null);
      setPendingVerificationEmail(null);
      if (activeTabOverride === "forgot") {
        setStep("forgot");
      } else {
        setStep("choice");
      }
    }
  }, [activeTabOverride]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const resetStatus = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setDevResetUrl(null);
    setDevVerifyUrl(null);
    setDevOtpCode(null);
  };

  const goToStep = (next: AuthFlowStep) => {
    resetStatus();
    setPendingVerificationEmail(null);
    setStep(next);
    if (next === "forgot") {
      onTabChange?.("forgot");
    } else {
      onTabChange?.("signin");
    }
  };

  const navigateAfterAuth = (role?: string, needsOnboarding?: boolean) => {
    setTimeout(() => {
      onClose?.();
      const searchParams = new URLSearchParams(window.location.search);
      const target = searchParams.get("target");
      const isStaffRole = isAdminRole(role);

      if (target === "admin" && isStaffRole) {
        router.push("/admin");
      } else if (isStaffRole) {
        router.push("/admin");
      } else if (needsOnboarding) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    }, 300);
  };

  const handleRequestEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStatus();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setErrorMsg(
        isId ? "Masukkan alamat email yang valid." : "Please enter a valid email address."
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await wellnessRequestEmailSignIn({ email: trimmedEmail });
      if (result.success) {
        setEmail(result.data?.email || trimmedEmail);
        setOtpDigits(Array(OTP_LENGTH).fill(""));
        setResendCooldown(RESEND_COOLDOWN_SEC);
        if (result.devOtpCode) setDevOtpCode(result.devOtpCode);
        if (result.devVerifyUrl) setDevVerifyUrl(result.devVerifyUrl);
        setSuccessMsg(
          isId
            ? "Kode verifikasi 6 digit telah dikirim ke email Anda."
            : result.message || "A 6-digit verification code has been sent to your email."
        );
        setStep("otp");
        requestAnimationFrame(() => {
          const active = typeof document !== "undefined" ? document.activeElement : null;
          const alreadyInOtp = otpInputRefs.current.some((el) => el && el === active);
          if (!alreadyInOtp) {
            otpInputRefs.current[0]?.focus();
          }
        });
      } else {
        setErrorMsg(result.message || "Could not send verification email.");
      }
    } catch {
      setErrorMsg("Connection error. Please try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitOtpCode = async (codeValue: string) => {
    if (verifyingOtpRef.current) return;
    const cleanCode = codeValue.replace(/\D/g, "");
    if (cleanCode.length !== OTP_LENGTH) {
      setErrorMsg(
        isId
          ? "Masukkan 6 digit kode verifikasi dari email Anda."
          : "Please enter all 6 digits from your email."
      );
      return;
    }

    verifyingOtpRef.current = true;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const result = await wellnessVerifyEmailOtp({
        email: email.trim().toLowerCase(),
        code: cleanCode,
      });

      if (result.success && result.data) {
        setSuccessMsg(
          result.data.needsOnboarding
            ? isId
              ? "Email terverifikasi! Menyiapkan profil Anda..."
              : "Email verified! Setting up your profile..."
            : isId
              ? "Berhasil masuk! Mengalihkan ke dashboard..."
              : "Signed in! Redirecting..."
        );
        navigateAfterAuth(result.data.role, result.data.needsOnboarding);
      } else {
        setErrorMsg(result.message || "Invalid or expired verification code.");
      }
    } catch {
      setErrorMsg("Connection error. Please try again in a moment.");
    } finally {
      setIsLoading(false);
      verifyingOtpRef.current = false;
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitOtpCode(otpDigits.join(""));
  };

  const handleOtpDigitChange = (index: number, rawVal: string) => {
    const digitsOnly = rawVal.replace(/\D/g, "");
    if (!digitsOnly) {
      const next = [...otpDigits];
      next[index] = "";
      setOtpDigits(next);
      return;
    }

    // Handle paste / multi-char input inside a single box
    if (digitsOnly.length > 1) {
      const next = [...otpDigits];
      for (let i = 0; i < OTP_LENGTH - index && i < digitsOnly.length; i++) {
        next[index + i] = digitsOnly[i];
      }
      setOtpDigits(next);
      const nextEmpty = next.findIndex((d) => !d);
      const focusIdx = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
      otpInputRefs.current[focusIdx]?.focus();
      if (next.every((d) => d.length === 1)) {
        void submitOtpCode(next.join(""));
      }
      return;
    }

    const next = [...otpDigits];
    next[index] = digitsOnly;
    setOtpDigits(next);
    if (index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d.length === 1)) {
      void submitOtpCode(next.join(""));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtpDigits(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    otpInputRefs.current[focusIdx]?.focus();
    if (pasted.length === OTP_LENGTH) {
      void submitOtpCode(pasted);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResendingVerify) return;
    setIsResendingVerify(true);
    setErrorMsg(null);
    try {
      const res = await wellnessRequestEmailSignIn({ email: email.trim().toLowerCase() });
      if (res.success) {
        setResendCooldown(RESEND_COOLDOWN_SEC);
        setOtpDigits(Array(OTP_LENGTH).fill(""));
        if (res.devOtpCode) setDevOtpCode(res.devOtpCode);
        if (res.devVerifyUrl) setDevVerifyUrl(res.devVerifyUrl);
        setSuccessMsg(
          isId
            ? "Kode verifikasi baru telah dikirim ke email Anda."
            : "A fresh 6-digit verification code has been sent."
        );
        requestAnimationFrame(() => {
          const active = typeof document !== "undefined" ? document.activeElement : null;
          const alreadyInOtp = otpInputRefs.current.some((el) => el && el === active);
          if (!alreadyInOtp) {
            otpInputRefs.current[0]?.focus();
          }
        });
      } else {
        setErrorMsg(res.message || "Could not resend verification code.");
      }
    } catch {
      setErrorMsg("Could not resend verification code. Please try again.");
    } finally {
      setIsResendingVerify(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return;
    setIsResendingVerify(true);
    setErrorMsg(null);
    try {
      const res = await wellnessResendVerificationEmail(pendingVerificationEmail);
      if (res.success) {
        setSuccessMsg(res.message || "Verification email sent.");
        if (res.devVerifyUrl) setDevVerifyUrl(res.devVerifyUrl);
      } else {
        setErrorMsg(res.message || "Could not resend verification email.");
      }
    } catch {
      setErrorMsg("Could not resend verification email. Please try again.");
    } finally {
      setIsResendingVerify(false);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStatus();

    if (!email.trim() || !password) {
      setErrorMsg("Please fill in your email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await wellnessSignIn({ email, password });
      if (result.success && result.data) {
        setSuccessMsg("Signed in successfully. Redirecting...");
        navigateAfterAuth(result.data.role, result.data.needsOnboarding);
      } else {
        if (result.requiresVerification) {
          setPendingVerificationEmail(email.trim().toLowerCase());
        }
        if (result.errors) {
          const detail = Object.values(result.errors).flat().join(". ");
          setErrorMsg(detail || result.message || "Invalid credentials.");
        } else {
          setErrorMsg(result.message || "Invalid email or password.");
        }
      }
    } catch {
      setErrorMsg("Connection error. Please try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStatus();

    if (!email.trim()) {
      setErrorMsg("Please enter your registered email.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await wellnessRequestPasswordReset(email);
      if (result.success) {
        setSuccessMsg(result.message || "Password recovery instructions sent.");
        if (result.devResetUrl) setDevResetUrl(result.devResetUrl);
      } else {
        setErrorMsg(result.message || "Unable to process password reset.");
      }
    } catch {
      setErrorMsg("Connection error. Please try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputBaseCls =
    "w-full h-11 sm:h-12 px-4 rounded-2xl bg-white/95 lg:bg-zinc-200/65 dark:bg-zinc-900/90 lg:dark:bg-white/[0.08] border border-zinc-200/80 lg:border-0 dark:border-white/10 text-[15px] sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-400 focus:bg-white lg:focus:bg-zinc-200/95 dark:focus:bg-zinc-900 lg:dark:focus:bg-white/[0.12] transition";
  const labelBaseCls =
    "block text-[11px] sm:text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5";

  return (
    <div
      className={`w-full text-zinc-900 dark:text-zinc-100 space-y-4 sm:space-y-5 ${
        isModal
          ? "rounded-3xl bg-[#f6f6f4] dark:bg-[#141414] p-5 sm:p-8 shadow-2xl"
          : ""
      }`}
    >
      {/* Modal Close Button */}
      {isModal && onClose && (
        <div className="flex items-center justify-between">
          <BrandLogo size="sm" />
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-200/60 dark:bg-white/10 text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white flex items-center justify-center transition active:scale-95"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected Cohort Context */}
      {contextProgramTitle && (
        <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
          <span className="font-mono text-[10px] uppercase tracking-widest shrink-0">
            Cohort:
          </span>
          <span className="font-semibold text-zinc-950 dark:text-white truncate">
            {contextProgramTitle}
          </span>
        </div>
      )}

      {/* Heading per Step */}
      {step === "choice" && (
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-geometric font-medium tracking-tight text-zinc-950 dark:text-white">
            {t.auth.signInTitle}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {isId
              ? "Masuk atau daftar otomatis dengan email maupun akun Google Anda."
              : "Sign in or get started instantly with your email or Google account."}
          </p>
        </div>
      )}

      {step === "email" && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => goToStep("choice")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.common.back}</span>
          </button>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950 dark:text-white">
              {isId ? "Masuk dengan Email" : "Sign in with Email"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {isId
                ? "Kami akan langsung mengirimkan kode verifikasi ke email Anda."
                : "We will send a 6-digit verification code straight to your inbox."}
            </p>
          </div>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => goToStep("email")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isId ? "Ganti email" : "Change email"}</span>
          </button>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950 dark:text-white">
              {isId ? "Cek email Anda" : "Check your email"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {isId ? "Masukkan kode 6 digit yang dikirim ke " : "Enter the 6-digit code sent to "}
              <span className="font-semibold text-zinc-950 dark:text-white break-all">{email}</span>
              {isId
                ? " atau klik tautan di dalam email."
                : ", or tap the verification link inside."}
            </p>
          </div>
        </div>
      )}

      {step === "password" && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => goToStep("email")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isId ? "Pakai kode email saja" : "Use email code instead"}</span>
          </button>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950 dark:text-white">
              {isId ? "Masuk dengan Kata Sandi" : "Sign in with Password"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {isId
                ? "Masukkan email dan kata sandi akun Anda."
                : "Enter your registered email and password."}
            </p>
          </div>
        </div>
      )}

      {step === "forgot" && (
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950 dark:text-white">
            {t.auth.forgotTitle}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
            {t.auth.forgotSubtitle}
          </p>
        </div>
      )}

      {/* Alerts */}
      {errorMsg && (
        <div
          role="alert"
          className="py-2.5 px-3.5 rounded-2xl bg-red-500/12 text-red-700 dark:text-red-300 text-xs flex items-start gap-2 leading-relaxed"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="py-2.5 px-3.5 rounded-2xl bg-zinc-900/8 dark:bg-white/12 text-zinc-950 dark:text-white text-xs flex items-start gap-2 leading-relaxed"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1.5 min-w-0">
            <p>{successMsg}</p>
            {devOtpCode && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5 font-mono">
                <span className="text-[11px] text-zinc-600 dark:text-zinc-300">
                  Dev OTP: <strong className="text-zinc-950 dark:text-white tracking-widest">{devOtpCode}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const digits = devOtpCode.split("").slice(0, OTP_LENGTH);
                    setOtpDigits(digits);
                    void submitOtpCode(devOtpCode);
                  }}
                  className="text-[11px] underline font-semibold text-zinc-950 dark:text-white hover:opacity-80"
                >
                  Auto-fill & verify &rarr;
                </button>
              </div>
            )}
            {devVerifyUrl && (
              <a
                href={devVerifyUrl}
                className="underline font-mono font-semibold text-[11px] text-zinc-950 dark:text-white block"
              >
                Verify via magic link (Dev) &rarr;
              </a>
            )}
            {devResetUrl && (
              <a
                href={devResetUrl}
                className="underline font-mono font-semibold text-[11px] text-zinc-950 dark:text-white block"
              >
                Open password reset link &rarr;
              </a>
            )}
          </div>
        </div>
      )}

      {pendingVerificationEmail && (
        <div className="py-2.5 px-3.5 rounded-2xl bg-zinc-200/70 dark:bg-white/10 text-xs flex items-center justify-between gap-2">
          <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Didn&apos;t receive the link?</span>
          </span>
          <button
            type="button"
            disabled={isResendingVerify}
            onClick={handleResendVerification}
            className="font-semibold underline text-zinc-950 dark:text-white hover:opacity-80 shrink-0 disabled:opacity-50"
          >
            {isResendingVerify ? "Sending..." : "Resend verification"}
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 1: CLEAN 2-BUTTON ENTRY (EMAIL & GOOGLE ONLY)                  */}
      {/* =================================================================== */}
      {step === "choice" && (
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={() => goToStep("email")}
            className="w-full h-12 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs sm:text-sm font-semibold tracking-wide flex items-center justify-center gap-2.5 transition active:scale-[0.99] cursor-pointer"
          >
            <Mail className="w-4 h-4 shrink-0" />
            <span>Sign in with Email</span>
          </button>

          <a
            href="/api/auth/google"
            className="w-full h-12 rounded-full border border-zinc-300 dark:border-white/20 bg-white/90 dark:bg-white/[0.06] hover:bg-white dark:hover:bg-white/[0.12] text-zinc-900 dark:text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2.5 transition active:scale-[0.99]"
          >
            <GoogleIcon />
            <span>Sign in with Google</span>
          </a>

          <p className="pt-2 text-[11px] leading-relaxed text-zinc-500 text-center">
            {isId ? (
              <>
                Dengan mendaftar atau melanjutkan, Anda menyetujui{" "}
                <Link
                  href="/terms"
                  className="text-zinc-800 underline underline-offset-2 hover:text-zinc-950 font-medium"
                >
                  Ketentuan Layanan
                </Link>{" "}
                dan{" "}
                <Link
                  href="/privacy"
                  className="text-zinc-800 underline underline-offset-2 hover:text-zinc-950 font-medium"
                >
                  Kebijakan Privasi
                </Link>{" "}
                kami.
              </>
            ) : (
              <>
                By signing up or continuing, you agree to our{" "}
                <Link
                  href="/terms"
                  className="text-zinc-800 underline underline-offset-2 hover:text-zinc-950 font-medium"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-zinc-800 underline underline-offset-2 hover:text-zinc-950 font-medium"
                >
                  Privacy Policy
                </Link>
                .
              </>
            )}
          </p>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 2: EMAIL INPUT (SENDS VERIFICATION OTP + MAGIC LINK)           */}
      {/* =================================================================== */}
      {step === "email" && (
        <form onSubmit={handleRequestEmailCode} className="space-y-3.5">
          <div>
            <label htmlFor="auth-email-input" className={labelBaseCls}>
              Email
            </label>
            <input
              id="auth-email-input"
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={inputBaseCls}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isId ? "Mengirim kode..." : "Sending code..."}</span>
              </>
            ) : (
              <>
                <span>{isId ? "Kirim Kode Verifikasi" : "Continue"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => goToStep("password")}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isId ? "Gunakan kata sandi" : "Use password instead"}</span>
            </button>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* STEP 3: 6-DIGIT EMAIL OTP VERIFICATION                              */}
      {/* =================================================================== */}
      {step === "otp" && (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <div
            className="grid grid-cols-6 gap-2 sm:gap-2.5"
            aria-label="6-digit verification code"
          >
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  otpInputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={idx === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${idx + 1}`}
                maxLength={OTP_LENGTH}
                value={digit}
                onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                onPaste={handleOtpPaste}
                disabled={isLoading}
                className="w-full h-12 sm:h-14 text-center text-lg sm:text-xl font-mono font-semibold rounded-2xl bg-white/95 lg:bg-zinc-200/70 dark:bg-zinc-900/90 lg:dark:bg-white/[0.08] border border-zinc-300/90 dark:border-white/15 text-zinc-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white focus:ring-1 focus:ring-zinc-950 dark:focus:ring-white transition"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading || otpDigits.join("").length < OTP_LENGTH}
            className="w-full h-12 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isId ? "Memverifikasi..." : "Verifying..."}</span>
              </>
            ) : (
              <>
                <span>{isId ? "Verifikasi & Lanjut" : "Verify & Continue"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 pt-0.5">
            <span>{isId ? "Belum menerima kode?" : "Didn't receive the code?"}</span>
            <button
              type="button"
              disabled={resendCooldown > 0 || isResendingVerify}
              onClick={handleResendOtp}
              className="inline-flex items-center gap-1 font-semibold text-zinc-950 dark:text-white hover:opacity-80 disabled:opacity-50 transition"
            >
              <RefreshCw className={`w-3 h-3 ${isResendingVerify ? "animate-spin" : ""}`} />
              <span>
                {resendCooldown > 0
                  ? `${isId ? "Kirim ulang" : "Resend"} (${resendCooldown}s)`
                  : isId
                    ? "Kirim ulang kode"
                    : "Resend code"}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* STEP 4: PASSWORD SIGN IN (ADMIN / STAFF / EXISTING PASSWORD USERS)  */}
      {/* =================================================================== */}
      {step === "password" && (
        <form onSubmit={handlePasswordSignIn} className="space-y-3">
          <div>
            <label htmlFor="auth-pwd-email" className={labelBaseCls}>
              Email
            </label>
            <input
              id="auth-pwd-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={inputBaseCls}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="auth-pwd-input"
                className="text-[11px] sm:text-xs font-medium text-zinc-700 dark:text-zinc-300"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => goToStep("forgot")}
                className="text-[11px] sm:text-xs text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition"
              >
                {t.auth.forgotLink}
              </button>
            </div>
            <div className="relative">
              <input
                id="auth-pwd-input"
                type={peekPassword ? "text" : "password"}
                required
                autoFocus={Boolean(email.trim())}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={`${inputBaseCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setPeekPassword(!peekPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition"
                aria-label={peekPassword ? "Hide password" : "Show password"}
              >
                {peekPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* STEP 5: FORGOT PASSWORD                                             */}
      {/* =================================================================== */}
      {step === "forgot" && (
        <form onSubmit={handleForgotPassword} className="space-y-3.5">
          <div>
            <label htmlFor="auth-forgot-email" className={labelBaseCls}>
              Registered Email
            </label>
            <input
              id="auth-forgot-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={inputBaseCls}
            />
          </div>

          <div className="pt-1 space-y-2.5">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>{t.auth.sendResetLink}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => goToStep("password")}
              className="w-full py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white flex items-center justify-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.auth.backToSignIn}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: AuthTabMode;
  contextProgramTitle?: string | null;
}

export function AuthModal({
  isOpen,
  onClose,
  initialTab = "signin",
  contextProgramTitle = null,
}: AuthModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[92vh] overflow-y-auto"
      >
        <AuthGatewayCard
          initialTab={initialTab}
          activeTabOverride={initialTab}
          onClose={onClose}
          isModal={true}
          contextProgramTitle={contextProgramTitle}
        />
      </div>
    </div>
  );
}
