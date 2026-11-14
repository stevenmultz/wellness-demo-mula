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
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  CheckCircle2,
  KeyRound,
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
        setSuccessMsg("Signed in successfully. Entering Sanctuary...");
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
        setSuccessMsg("Account created! Preparing your member dashboard...");
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
    "w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-white/10 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-white transition";
  const labelBaseCls =
    "block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5";

  return (
    <div className="w-full rounded-3xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 p-5 sm:p-7 shadow-sm text-zinc-900 dark:text-zinc-100 space-y-5">
      {/* Top Identity & Close Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center font-mono text-sm font-medium leading-none">
            +
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block leading-none">
              Member Portal
            </span>
            <span className="text-xs font-geometric font-semibold tracking-[0.18em] text-zinc-950 dark:text-white uppercase">
              BMS Sanctuary
            </span>
          </div>
        </div>

        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-500 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center transition active:scale-95"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Optional Program Enrollment Context Banner */}
      {contextProgramTitle && (
        <div className="px-3.5 py-2.5 rounded-xl bg-zinc-100/80 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
          <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px] uppercase tracking-wider shrink-0">
            Selected Cohort
          </span>
          <span className="font-semibold text-zinc-950 dark:text-white truncate">
            {contextProgramTitle}
          </span>
        </div>
      )}

      {/* Segmented Mode Switcher (Matches Member Dashboard Segmented Controls) */}
      {tab !== "forgot" && (
        <div
          role="tablist"
          aria-label="Authentication mode"
          className="grid grid-cols-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 gap-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "signin"}
            onClick={() => switchTab("signin")}
            className={`py-2 rounded-lg text-xs font-semibold transition ${
              tab === "signin"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "signup"}
            onClick={() => switchTab("signup")}
            className={`py-2 rounded-lg text-xs font-semibold transition ${
              tab === "signup"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>
      )}

      {/* Heading Copy */}
      <div className="space-y-1">
        {tab === "signin" && (
          <>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
              Sign in to your account
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Access your daily 00:00 WIB movement, nutrition, and recovery check-ins.
            </p>
          </>
        )}
        {tab === "signup" && (
          <>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
              Join BMS Sanctuary
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Create your member profile to enroll in private cohorts and track daily progress.
            </p>
          </>
        )}
        {tab === "forgot" && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0 mt-0.5">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">
                Reset your password
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Enter your registered email to receive a secure recovery link.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Banners (Dashboard Monochrome Style) */}
      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900/40 dark:text-red-300 text-xs flex items-start gap-2.5 leading-relaxed font-mono"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-zinc-900/5 border border-zinc-300 text-zinc-900 dark:bg-white/10 dark:border-white/20 dark:text-zinc-100 text-xs flex items-start gap-2.5 leading-relaxed font-mono"
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
      {/* TAB 1: SIGN IN                                                      */}
      {/* =================================================================== */}
      {tab === "signin" && (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className={labelBaseCls}>Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => switchTab("forgot")}
                className="text-[11px] font-mono text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white underline transition"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={peekPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={signInData.password}
                onChange={(e) =>
                  setSignInData({ ...signInData, password: e.target.value })
                }
                placeholder="Enter your password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-white/10 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-white transition"
              />
              <button
                type="button"
                onClick={() => setPeekPassword(!peekPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
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

          {/* X.com-style Secondary Switcher */}
          <div className="pt-3 border-t border-zinc-100 dark:border-white/10 space-y-2.5">
            <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 text-center">
              Don&apos;t have an account?
            </p>
            <button
              type="button"
              onClick={() => switchTab("signup")}
              className="w-full h-10 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-white/10 text-xs font-semibold transition flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span>Create Account</span>
            </button>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* TAB 2: SIGN UP                                                      */}
      {/* =================================================================== */}
      {tab === "signup" && (
        <form onSubmit={handleSignUp} className="space-y-3.5">
          <div>
            <label className={labelBaseCls}>Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelBaseCls}>Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
            </div>

            <div>
              <label className={labelBaseCls}>
                WhatsApp / Phone{" "}
                <span className="text-zinc-400 font-normal text-[10px]">
                  (Optional)
                </span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
          </div>

          <div>
            <label className={labelBaseCls}>Create Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={peekPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={signUpData.password}
                onChange={(e) =>
                  setSignUpData({ ...signUpData, password: e.target.value })
                }
                placeholder="Min. 8 characters"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-white/10 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-white transition"
              />
              <button
                type="button"
                onClick={() => setPeekPassword(!peekPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
                aria-label={peekPassword ? "Hide password" : "Show password"}
              >
                {peekPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Live Password Requirements Pills */}
            <div className="grid grid-cols-3 gap-1.5 pt-2">
              {[
                { key: "length", label: "8+ chars", met: passChecks.length },
                { key: "upper", label: "1 uppercase", met: passChecks.upper },
                { key: "number", label: "1 number", met: passChecks.number },
              ].map((req) => (
                <div
                  key={req.key}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono flex items-center justify-center gap-1 border transition ${
                    req.met
                      ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-950 dark:border-white font-semibold"
                      : "bg-zinc-50 text-zinc-400 border-zinc-200/80 dark:bg-white/[0.03] dark:text-zinc-500 dark:border-white/10"
                  }`}
                >
                  <Check className="w-2.5 h-2.5 shrink-0" />
                  <span>{req.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
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

          {/* X.com-style Secondary Switcher */}
          <div className="pt-3 border-t border-zinc-100 dark:border-white/10 space-y-2.5">
            <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 text-center">
              Already have an account?
            </p>
            <button
              type="button"
              onClick={() => switchTab("signin")}
              className="w-full h-10 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-white/10 text-xs font-semibold transition flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span>Sign In</span>
            </button>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* TAB 3: FORGOT PASSWORD                                              */}
      {/* =================================================================== */}
      {tab === "forgot" && (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label className={labelBaseCls}>Registered Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Recovery Link...</span>
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
            className="w-full h-10 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-white/10 text-xs font-semibold transition flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </button>
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
