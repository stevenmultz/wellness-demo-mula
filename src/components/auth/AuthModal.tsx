"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/common/BrandLogo";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import {
  wellnessSignIn,
  wellnessSignUp,
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
} from "lucide-react";

export type AuthTabMode = "signin" | "signup" | "forgot";

interface AuthGatewayCardProps {
  initialTab?: AuthTabMode;
  activeTabOverride?: AuthTabMode;
  onTabChange?: (tab: AuthTabMode) => void;
  onClose?: () => void;
  isModal?: boolean;
  contextProgramTitle?: string | null;
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
  const [tab, setTab] = useState<AuthTabMode>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [isResendingVerify, setIsResendingVerify] = useState(false);

  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [signUpData, setSignUpData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [forgotEmail, setForgotEmail] = useState("");
  const [peekPassword, setPeekPassword] = useState(false);
  const { t } = useLocale();

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
      setPendingVerificationEmail(null);
      setTab(activeTabOverride);
    }
  }, [activeTabOverride]);

  const resetStatus = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setDevResetUrl(null);
    setDevVerifyUrl(null);
  };

  const switchTab = (newTab: AuthTabMode) => {
    resetStatus();
    setPendingVerificationEmail(null);
    setTab(newTab);
    onTabChange?.(newTab);
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return;
    setIsResendingVerify(true);
    setErrorMsg(null);
    try {
      const res = await wellnessResendVerificationEmail(pendingVerificationEmail);
      if (res.success) {
        setSuccessMsg(res.message || "Verification email sent.");
        const extra = res as { devVerifyUrl?: string };
        if (extra.devVerifyUrl) setDevVerifyUrl(extra.devVerifyUrl);
      } else {
        setErrorMsg(res.message || "Could not resend verification email.");
      }
    } catch {
      setErrorMsg("Could not resend verification email. Please try again.");
    } finally {
      setIsResendingVerify(false);
    }
  };

  const validatePassword = (pass: string) => {
    return pass.length >= 8 && /[A-Z]/.test(pass) && /\d/.test(pass);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStatus();

    if (!signInData.email.trim() || !signInData.password) {
      setErrorMsg("Please fill in your email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await wellnessSignIn(signInData);
      if (result.success && result.data) {
        setSuccessMsg("Signed in successfully. Redirecting...");
        setTimeout(() => {
          onClose?.();
          const searchParams = new URLSearchParams(window.location.search);
          const target = searchParams.get("target");

          const isStaffRole = isAdminRole(result.data?.role);
          if (target === "admin" && isStaffRole) {
            router.push("/admin");
          } else if (target === "dashboard") {
            router.push("/dashboard");
          } else if (isStaffRole) {
            router.push("/admin");
          } else {
            router.push("/dashboard");
          }
          router.refresh();
        }, 300);
      } else {
        const extra = result as { requiresVerification?: boolean };
        if (extra.requiresVerification) {
          setPendingVerificationEmail(signInData.email.trim().toLowerCase());
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStatus();
    setPendingVerificationEmail(null);

    if (signUpData.fullName.trim().length < 3) {
      setErrorMsg("Full name must be at least 3 characters.");
      return;
    }
    if (!signUpData.email.trim()) {
      setErrorMsg("Email is required.");
      return;
    }
    if (signUpData.phone.trim().length < 10) {
      setErrorMsg("WhatsApp number must be at least 10 digits.");
      return;
    }
    if (!validatePassword(signUpData.password)) {
      setErrorMsg(
        "Password must be at least 8 characters and include at least 1 uppercase letter and 1 number."
      );
      return;
    }

    setIsLoading(true);

    try {
      const result = await wellnessSignUp(signUpData);
      const extra = result as { requiresVerification?: boolean; devVerifyUrl?: string };
      if (result.success) {
        if (extra.requiresVerification) {
          setPendingVerificationEmail(signUpData.email.trim().toLowerCase());
          if (extra.devVerifyUrl) setDevVerifyUrl(extra.devVerifyUrl);
          setSuccessMsg(
            result.message || "Account created! Please check your email to verify your address before signing in."
          );
        } else if (result.data) {
          setSuccessMsg("Account created! Entering Sanctuary...");
          setTimeout(() => {
            onClose?.();
            router.push("/dashboard");
            router.refresh();
          }, 400);
        }
      } else {
        if (result.errors) {
          const detail = Object.values(result.errors).flat().join(". ");
          setErrorMsg(detail || result.message || "Registration failed.");
        } else {
          setErrorMsg(result.message || "Registration failed.");
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

    if (!forgotEmail.trim()) {
      setErrorMsg("Please enter your registered email.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await wellnessRequestPasswordReset(forgotEmail);
      if (result.success) {
        setSuccessMsg(
          result.message || "Password recovery instructions sent."
        );
        const extra = result as { devResetUrl?: string };
        if (extra.devResetUrl) {
          setDevResetUrl(extra.devResetUrl);
        }
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
    "w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-white/90 lg:bg-zinc-200/65 dark:bg-zinc-900/90 lg:dark:bg-white/[0.08] border-0 text-base sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 outline-none focus:bg-white lg:focus:bg-zinc-200/95 dark:focus:bg-zinc-900 lg:dark:focus:bg-white/[0.12] transition";
  const labelBaseCls =
    "block text-[11px] sm:text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1";

  return (
    <div
      className={`w-full text-zinc-900 dark:text-zinc-100 space-y-3.5 sm:space-y-5 ${
        isModal
          ? "rounded-3xl bg-[#f6f6f4] dark:bg-[#141414] p-5 sm:p-8 shadow-2xl"
          : ""
      }`}
    >
      {/* Modal Close Button (Only when rendered as popup) */}
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

      {/* Selected Cohort Context (Unboxed) */}
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

      {/* Clean Unboxed Heading & Mode Tabs */}
      {tab !== "forgot" ? (
        <div className="space-y-2.5 sm:space-y-3.5">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
              {tab === "signin" ? t.auth.signInTitle : t.auth.signUpTitle}
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {tab === "signin"
                ? t.auth.signInSubtitle
                : t.auth.signUpSubtitle}
            </p>
          </div>

          {/* Unboxed Minimal Tab Switcher */}
          <div
            role="tablist"
            aria-label="Authentication mode"
            className="inline-flex items-center gap-6 border-b border-zinc-300/80 dark:border-white/15 w-full"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "signin"}
              onClick={() => switchTab("signin")}
              className={`pb-2 text-[11px] sm:text-xs font-semibold tracking-wide uppercase transition relative ${
                tab === "signin"
                  ? "text-zinc-950 dark:text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-zinc-950 dark:after:bg-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {t.auth.signInTab}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "signup"}
              onClick={() => switchTab("signup")}
              className={`pb-2 text-[11px] sm:text-xs font-semibold tracking-wide uppercase transition relative ${
                tab === "signup"
                  ? "text-zinc-950 dark:text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-zinc-950 dark:after:bg-white"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {t.auth.signUpTab}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <h1 className="text-xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
            {t.auth.forgotTitle}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
            {t.auth.forgotSubtitle}
          </p>
        </div>
      )}

      {/* Validation & Feedback Notices (Only shown on error or submit) */}
      {errorMsg && (
        <div
          role="alert"
          className="py-2 px-3 rounded-xl bg-red-500/15 text-red-700 dark:text-red-300 text-xs flex items-start gap-2 leading-relaxed"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="py-2 px-3 rounded-xl bg-zinc-900/10 dark:bg-white/15 text-zinc-950 dark:text-white text-xs flex items-start gap-2 leading-relaxed font-mono"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>{successMsg}</p>
            {devVerifyUrl && (
              <a
                href={devVerifyUrl}
                className="underline font-semibold text-zinc-950 dark:text-white block"
              >
                Verify email now (Dev link) &rarr;
              </a>
            )}
            {devResetUrl && (
              <a
                href={devResetUrl}
                className="underline font-semibold text-zinc-950 dark:text-white block"
              >
                Open password reset link &rarr;
              </a>
            )}
          </div>
        </div>
      )}

      {pendingVerificationEmail && (
        <div className="py-2 px-3 rounded-xl bg-zinc-200/70 dark:bg-white/10 text-xs flex items-center justify-between gap-2">
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
      {/* TAB 1: SIGN IN (SIMPLE LABEL + INPUT, ALL REQUIRED)                 */}
      {/* =================================================================== */}
      {tab === "signin" && (
        <form onSubmit={handleSignIn} className="space-y-3 sm:space-y-3.5">
          <div>
            <label className={labelBaseCls}>Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={signInData.email}
              onChange={(e) =>
                setSignInData({ ...signInData, email: e.target.value })
              }
              placeholder="Enter your email"
              className={inputBaseCls}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] sm:text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => switchTab("forgot")}
                className="text-[11px] sm:text-xs text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={peekPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={signInData.password}
                onChange={(e) =>
                  setSignInData({ ...signInData, password: e.target.value })
                }
                placeholder="Enter your password"
                className={`${inputBaseCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setPeekPassword(!peekPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition"
                aria-label={peekPassword ? "Hide password" : "Show password"}
              >
                {peekPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-1.5">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 sm:h-12 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[11px] sm:text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
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

          <div className="relative py-1 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-300/70 dark:bg-white/15" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              or
            </span>
            <div className="h-px flex-1 bg-zinc-300/70 dark:bg-white/15" />
          </div>

          <a
            href="/api/auth/google"
            className="w-full h-10 sm:h-11 rounded-full border border-zinc-300 dark:border-white/20 bg-white/80 dark:bg-white/[0.06] hover:bg-white dark:hover:bg-white/[0.12] text-zinc-900 dark:text-white text-[11px] sm:text-xs font-medium flex items-center justify-center gap-2 transition active:scale-[0.99]"
          >
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
            <span>Continue with Google</span>
          </a>
        </form>
      )}

      {/* =================================================================== */}
      {/* TAB 2: SIGN UP (SIMPLE LABEL + INPUT, ALL REQUIRED)                 */}
      {/* =================================================================== */}
      {tab === "signup" && (
        <form onSubmit={handleSignUp} className="space-y-2.5 sm:space-y-3">
          <div>
            <label className={labelBaseCls}>Full Name</label>
            <input
              type="text"
              required
              autoComplete="name"
              value={signUpData.fullName}
              onChange={(e) =>
                setSignUpData({ ...signUpData, fullName: e.target.value })
              }
              placeholder="Enter your full name"
              className={inputBaseCls}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div>
              <label className={labelBaseCls}>Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={signUpData.email}
                onChange={(e) =>
                  setSignUpData({ ...signUpData, email: e.target.value })
                }
                placeholder="Enter your email"
                className={inputBaseCls}
              />
            </div>

            <div>
              <label className={labelBaseCls}>WhatsApp</label>
              <input
                type="tel"
                required
                autoComplete="tel"
                value={signUpData.phone}
                onChange={(e) =>
                  setSignUpData({ ...signUpData, phone: e.target.value })
                }
                placeholder="Enter your WhatsApp number"
                className={inputBaseCls}
              />
            </div>
          </div>

          <div>
            <label className={labelBaseCls}>Password</label>
            <div className="relative">
              <input
                type={peekPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={signUpData.password}
                onChange={(e) =>
                  setSignUpData({ ...signUpData, password: e.target.value })
                }
                placeholder="Enter your password"
                className={`${inputBaseCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setPeekPassword(!peekPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition"
                aria-label={peekPassword ? "Hide password" : "Show password"}
              >
                {peekPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-1.5">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 sm:h-12 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[11px] sm:text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          <div className="relative py-1 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-300/70 dark:bg-white/15" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              or
            </span>
            <div className="h-px flex-1 bg-zinc-300/70 dark:bg-white/15" />
          </div>

          <a
            href="/api/auth/google"
            className="w-full h-10 sm:h-11 rounded-full border border-zinc-300 dark:border-white/20 bg-white/80 dark:bg-white/[0.06] hover:bg-white dark:hover:bg-white/[0.12] text-zinc-900 dark:text-white text-[11px] sm:text-xs font-medium flex items-center justify-center gap-2 transition active:scale-[0.99]"
          >
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
            <span>Sign Up with Google</span>
          </a>
        </form>
      )}

      {/* =================================================================== */}
      {/* TAB 3: FORGOT PASSWORD (SIMPLE LABEL + INPUT, REQUIRED)             */}
      {/* =================================================================== */}
      {tab === "forgot" && (
        <form onSubmit={handleForgotPassword} className="space-y-3 sm:space-y-4">
          <div>
            <label className={labelBaseCls}>Registered Email</label>
            <input
              type="email"
              required
              autoFocus
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="Enter your email"
              className={inputBaseCls}
            />
          </div>

          <div className="pt-1 space-y-2.5">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 sm:h-12 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[11px] sm:text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => switchTab("signin")}
              className="w-full py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white flex items-center justify-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
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
