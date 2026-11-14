"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  wellnessSignIn,
  wellnessSignUp,
  wellnessRequestPasswordReset,
} from "@/wellness/actions/auth";
import { X, Loader2, Eye, EyeOff } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "signin" | "signup" | "forgot";
}

export function AuthModal({
  isOpen,
  onClose,
  initialTab = "signup",
}: AuthModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">(initialTab);
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

  if (!isOpen) return null;

  const resetStatus = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setDevResetUrl(null);
  };

  const switchTab = (newTab: "signin" | "signup" | "forgot") => {
    resetStatus();
    setTab(newTab);
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
          onClose();
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
        }, 350);
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
      setErrorMsg("Password must be at least 8 characters and include at least 1 uppercase letter and 1 number.");
      return;
    }

    setIsLoading(true);
    resetStatus();

    try {
      const result = await wellnessSignUp(signUpData);
      if (result.success && result.data) {
        setSuccessMsg("Account created successfully! Redirecting...");
        setTimeout(() => {
          onClose();
          router.push("/dashboard");
          router.refresh();
        }, 450);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 dark:bg-[#0B0D10]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        data-lenis-prevent
        className="relative w-full max-w-lg rounded-2xl glass-panel shadow-2xl p-6 sm:p-8 text-zinc-900 dark:text-zinc-100 max-h-[92vh] overflow-y-auto"
      >
        {/* Top Header Row with Switcher & Close Button */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200/70 dark:border-zinc-700/80">
          <span className="text-sm font-semibold tracking-[0.24em] text-zinc-900 dark:text-zinc-100 block font-mono">
            + BMS
          </span>

          <div className="flex items-center gap-2.5">
            {tab !== "forgot" && (
              <div className="flex items-center p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-900 border border-zinc-300/70 dark:border-zinc-700/80">
                <button
                  type="button"
                  onClick={() => switchTab("signup")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    tab === "signup"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/60 dark:border-zinc-700"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => switchTab("signin")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    tab === "signin"
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/60 dark:border-zinc-700"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  Sign In
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Banners */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-300 text-xs leading-relaxed">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs leading-relaxed font-mono">
            <p>{successMsg}</p>
            {devResetUrl && (
              <a
                href={devResetUrl}
                className="underline font-semibold text-emerald-900 dark:text-emerald-200 block mt-1.5"
              >
                Open password reset link &rarr;
              </a>
            )}
          </div>
        )}

        {/* TAB 1: SIGN UP (SINGLE STEP) */}
        {tab === "signup" && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Full Name <span className="text-zinc-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={signUpData.fullName}
                  onChange={(e) =>
                    setSignUpData({ ...signUpData, fullName: e.target.value })
                  }
                  placeholder="Enter your full name"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Email Address <span className="text-zinc-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={signUpData.email}
                  onChange={(e) =>
                    setSignUpData({ ...signUpData, email: e.target.value })
                  }
                  placeholder="Enter your email"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Phone / WhatsApp <span className="text-zinc-400 font-normal text-[11px]">(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={signUpData.phone}
                  onChange={(e) =>
                    setSignUpData({ ...signUpData, phone: e.target.value })
                  }
                  placeholder="Enter your phone number"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Password <span className="text-zinc-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={peekPassword ? "text" : "password"}
                    required
                    value={signUpData.password}
                    onChange={(e) =>
                      setSignUpData({ ...signUpData, password: e.target.value })
                    }
                    placeholder="Enter your password (min. 8 characters)"
                    className="w-full pl-4 pr-11 py-2.5 rounded-xl glass-input text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setPeekPassword(!peekPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
                    aria-label="Toggle password visibility"
                  >
                    {peekPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-zinc-500">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("signin")}
                  className="font-bold text-zinc-900 dark:text-zinc-100 underline ml-0.5"
                >
                  Sign In
                </button>
              </span>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto chrome-button px-7 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: SIGN IN */}
        {tab === "signin" && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Email Address <span className="text-zinc-500">*</span>
              </label>
              <input
                type="email"
                autoFocus
                required
                value={signInData.email}
                onChange={(e) =>
                  setSignInData({ ...signInData, email: e.target.value })
                }
                placeholder="Enter your email"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Password <span className="text-zinc-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => switchTab("forgot")}
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline font-mono"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={peekPassword ? "text" : "password"}
                  required
                  value={signInData.password}
                  onChange={(e) =>
                    setSignInData({ ...signInData, password: e.target.value })
                  }
                  placeholder="Enter your password"
                  className="w-full pl-4 pr-11 py-2.5 rounded-xl glass-input text-sm"
                />
                <button
                  type="button"
                  onClick={() => setPeekPassword(!peekPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
                  aria-label="Toggle password visibility"
                >
                  {peekPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-zinc-500">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("signup")}
                  className="font-bold text-zinc-900 dark:text-zinc-100 underline ml-0.5"
                >
                  Sign Up
                </button>
              </span>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto chrome-button px-7 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: FORGOT PASSWORD */}
        {tab === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Enter your registered email address to receive password recovery instructions.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Email Address <span className="text-zinc-500">*</span>
              </label>
              <input
                type="email"
                autoFocus
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => switchTab("signin")}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline"
              >
                &larr; Back to Sign In
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="chrome-button px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
