"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { wellnessConfirmPasswordReset } from "@/wellness/actions/auth";
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [peekNewPassword, setPeekNewPassword] = useState(false);
  const [peekConfirmPassword, setPeekConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const passChecks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    number: /\d/.test(newPassword),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!token) {
      setErrorMsg("Password reset token is missing from this URL.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await wellnessConfirmPasswordReset({
        token,
        newPassword,
        confirmPassword,
      });

      if (result.success) {
        setSuccessMsg(result.message || "Password updated successfully.");
        setTimeout(() => {
          router.push("/?auth=signin");
        }, 1200);
      } else {
        setErrorMsg(result.message || "Failed to reset password.");
      }
    } catch {
      setErrorMsg("An error occurred while updating your password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 p-5 sm:p-7 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center font-mono text-sm font-medium leading-none">
            +
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block leading-none">
              Security Recovery
            </span>
            <span className="text-xs font-geometric font-semibold tracking-[0.18em] text-zinc-950 dark:text-white uppercase">
              BMS Sanctuary
            </span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center">
          <KeyRound className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">
          Set New Password
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Choose a strong password for your BMS Sanctuary member account.
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3.5 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900/40 dark:text-red-300 font-mono"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="flex items-start gap-2.5 p-3.5 text-xs rounded-xl bg-zinc-900/5 border border-zinc-300 text-zinc-900 dark:bg-white/10 dark:border-white/20 dark:text-zinc-100 font-mono"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{successMsg}</p>
        </div>
      )}

      {!token ? (
        <div className="text-center p-5 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-400 text-xs space-y-4">
          <p>
            Reset token was not found. Please request a new reset link from the
            sign-in gateway.
          </p>
          <div>
            <Link
              href="/?auth=forgot"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold"
            >
              <span>Request New Link</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={peekNewPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-white/10 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-white transition"
              />
              <button
                type="button"
                aria-label={
                  peekNewPassword ? "Hide new password" : "Show new password"
                }
                onClick={() => setPeekNewPassword(!peekNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
              >
                {peekNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

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

          <div>
            <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={peekConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-white/10 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-white transition"
              />
              <button
                type="button"
                aria-label={
                  peekConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                onClick={() => setPeekConfirmPassword(!peekConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
              >
                {peekConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !!successMsg}
            className="w-full h-11 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                Save New Password <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      )}

      <div className="pt-2 border-t border-zinc-100 dark:border-white/10">
        <Link
          href="/"
          className="w-full h-10 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-white/10 text-xs font-semibold transition flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Sign In Gateway</span>
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>
      <Suspense
        fallback={
          <div
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 p-7 space-y-5"
            role="status"
            aria-label="Loading password reset form"
          >
            <div className="w-10 h-10 rounded-xl skeleton-block" />
            <div className="space-y-2">
              <div className="h-5 w-40 skeleton-block" />
              <div className="h-3.5 w-56 skeleton-block" />
            </div>
            <div className="space-y-3 pt-2">
              <div className="h-10 w-full skeleton-block" />
              <div className="h-10 w-full skeleton-block" />
              <div className="h-10 w-full skeleton-block" />
            </div>
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
