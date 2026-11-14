"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  wellnessSignIn,
  wellnessSignUp,
  wellnessRequestPasswordReset,
} from "@/wellness/actions/auth";
import {
  X,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  CheckCircle2,
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

  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [signUpData, setSignUpData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [forgotEmail, setForgotEmail] = useState("");
  const [peekPassword, setPeekPassword] = useState(false);

  useEffect(() => {
    if (activeTabOverride) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setDevResetUrl(null);
      setTab(activeTabOverride);
    }
  }, [activeTabOverride]);

  const resetStatus = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setDevResetUrl(null);
  };

  const switchTab = (newTab: AuthTabMode) => {
    resetStatus();
    setTab(newTab);
    onTabChange?.(newTab);
  };

  const passChecks = {
    length: signUpData.password.length >= 8,
    upper: /[A-Z]/.test(signUpData.password),
    number: /\d/.test(signUpData.password),
  };

  const validatePassword = (pass: string) => {
    return pass.length >= 8 && /[A-Z]/.test(pass) && /\d/.test(pass);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetStatus();

    try {
      const result = await wellnessSignIn(signInData);
      if (result.success && result.data) {
        setSuccessMsg("Signed in successfully. Redirecting...");
        setTimeout(() => {
          onClose?.();
          const searchParams = new URLSearchParams(window.location.search);
          const target = searchParams.get("target");

          if (target === "admin" && result.data?.role === "SUPERADMIN") {
            router.push("/admin");
          } else if (target === "dashboard") {
            router.push("/dashboard");
          } else if (result.data?.role === "SUPERADMIN") {
            router.push("/admin");
          } else {
            router.push("/dashboard");
          }
          router.refresh();
        }, 300);
      } else {
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
    if (!validatePassword(signUpData.password)) {
      setErrorMsg(
        "Password must be at least 8 characters and include at least 1 uppercase letter and 1 number."
      );
      return;
    }

    setIsLoading(true);
    resetStatus();

    try {
      const result = await wellnessSignUp(signUpData);
      if (result.success && result.data) {
        setSuccessMsg("Account created! Entering Sanctuary...");
        setTimeout(() => {
          onClose?.();
          router.push("/dashboard");
          router.refresh();
        }, 400);
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
    setIsLoading(true);
    resetStatus();

    try {
      const result = await wellnessRequestPasswordReset(forgotEmail);
      if (result.success) {
        setSuccessMsg(result.message || "Password recovery instructions sent.");
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
    "w-full px-4 py-3.5 rounded-2xl bg-zinc-200/55 dark:bg-white/[0.06] border-0 text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:bg-zinc-200/90 dark:focus:bg-white/[0.1] transition";
  const labelBaseCls =
    "block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5";

  return (
    <div
      className={`w-full text-zinc-900 dark:text-zinc-100 space-y-6 ${
        isModal
          ? "rounded-3xl bg-[#f6f6f4] dark:bg-[#141414] p-6 sm:p-8 shadow-2xl"
          : ""
      }`}
    >
      {/* Modal Close Button (Only when rendered as popup) */}
      {isModal && onClose && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-geometric font-semibold tracking-[0.24em] uppercase text-zinc-950 dark:text-white">
            + BMS
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-200/60 dark:bg-white/10 text-zinc-500 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center transition active:scale-95"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected Cohort Context (Unboxed) */}
      {contextProgramTitle && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-mono text-[10px] uppercase tracking-widest">
            Selected Cohort:
          </span>
          <span className="font-semibold text-zinc-950 dark:text-white truncate">
            {contextProgramTitle}
          </span>
        </div>
      )}

      {/* Clean Unboxed Heading & Mode Tabs */}
      {tab !== "forgot" ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
              {tab === "signin" ? "Sign in to BMS" : "Create your account"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              {tab === "signin"
                ? "Enter your details to access your daily 00:00 WIB cohort protocol."
                : "Join private athletic cohorts and track your daily longevity rituals."}
            </p>
          </div>

          {/* Unboxed Minimal Tab Switcher */}
          <div
            role="tablist"
            aria-label="Authentication mode"
            className="inline-flex items-center gap-6 border-b border-zinc-200/70 dark:border-white/10 w-full"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "signin"}
              onClick={() => switchTab("signin")}
              className={`pb-2.5 text-xs font-semibold tracking-wide uppercase transition relative ${
                tab === "signin"
                  ? "text-zinc-950 dark:text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-zinc-950 dark:after:bg-white"
                  : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "signup"}
              onClick={() => switchTab("signup")}
              className={`pb-2.5 text-xs font-semibold tracking-wide uppercase transition relative ${
                tab === "signup"
                  ? "text-zinc-950 dark:text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-zinc-950 dark:after:bg-white"
                  : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
            Reset password
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Enter your registered email address to receive a recovery link.
          </p>
        </div>
      )}

      {/* Unboxed Feedback Notices */}
      {errorMsg && (
        <div
          role="alert"
          className="py-2.5 px-3.5 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-300 text-xs flex items-start gap-2 leading-relaxed"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="py-2.5 px-3.5 rounded-2xl bg-zinc-200/70 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 text-xs flex items-start gap-2 leading-relaxed font-mono"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>{successMsg}</p>
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

      {/* =================================================================== */}
      {/* TAB 1: SIGN IN (BORDERLESS & UNBOXED)                               */}
      {/* =================================================================== */}
      {tab === "signin" && (
        <form onSubmit={handleSignIn} className="space-y-4">
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
              placeholder="name@example.com"
              className={inputBaseCls}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Password
              </label>
              <button
                type="button"
                onClick={() => switchTab("forgot")}
                className="text-xs text-zinc-400 hover:text-zinc-950 dark:text-zinc-500 dark:hover:text-white transition"
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
                className={`${inputBaseCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setPeekPassword(!peekPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition"
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

          <div className="pt-2 space-y-4">
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

            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => switchTab("signup")}
                className="font-semibold text-zinc-950 dark:text-white underline underline-offset-4 ml-1"
              >
                Sign up
              </button>
            </p>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* TAB 2: SIGN UP (BORDERLESS & UNBOXED)                               */}
      {/* =================================================================== */}
      {tab === "signup" && (
        <form onSubmit={handleSignUp} className="space-y-3.5">
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
              placeholder="Your full name"
              className={inputBaseCls}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                placeholder="name@example.com"
                className={inputBaseCls}
              />
            </div>

            <div>
              <label className={labelBaseCls}>
                WhatsApp{" "}
                <span className="text-zinc-400 font-normal text-[11px]">
                  (Optional)
                </span>
              </label>
              <input
                type="tel"
                autoComplete="tel"
                value={signUpData.phone}
                onChange={(e) =>
                  setSignUpData({ ...signUpData, phone: e.target.value })
                }
                placeholder="+62 812..."
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
                placeholder="Create a password"
                className={`${inputBaseCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setPeekPassword(!peekPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition"
                aria-label={peekPassword ? "Hide password" : "Show password"}
              >
                {peekPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Unboxed Minimal Password Requirement Indicators */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] font-mono">
              {[
                { key: "length", label: "8+ characters", met: passChecks.length },
                { key: "upper", label: "1 uppercase", met: passChecks.upper },
                { key: "number", label: "1 number", met: passChecks.number },
              ].map((req) => (
                <span
                  key={req.key}
                  className={`inline-flex items-center gap-1 transition ${
                    req.met
                      ? "text-zinc-950 dark:text-white font-semibold"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>{req.label}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 space-y-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
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

            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchTab("signin")}
                className="font-semibold text-zinc-950 dark:text-white underline underline-offset-4 ml-1"
              >
                Sign in
              </button>
            </p>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* TAB 3: FORGOT PASSWORD (BORDERLESS & UNBOXED)                       */}
      {/* =================================================================== */}
      {tab === "forgot" && (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label className={labelBaseCls}>Registered Email</label>
            <input
              type="email"
              required
              autoFocus
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="name@example.com"
              className={inputBaseCls}
            />
          </div>

          <div className="pt-1 space-y-3">
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
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => switchTab("signin")}
              className="w-full py-2 text-xs font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center gap-1.5 transition"
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
