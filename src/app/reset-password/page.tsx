"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { wellnessConfirmPasswordReset } from "@/wellness/actions/auth";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
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

  const inputCls =
    "w-full px-4 py-3.5 rounded-2xl bg-zinc-200/55 dark:bg-white/[0.06] border-0 text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:bg-zinc-200/90 dark:focus:bg-white/[0.1] transition pr-11";

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex items-center gap-2">
        <span className="font-mono font-light text-xl leading-none">+</span>
        <span className="font-geometric font-semibold text-xs tracking-[0.28em] uppercase">
          BMS
        </span>
      </div>

      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
          Set new password
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          Choose a strong password for your BMS Sanctuary account.
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2 py-2.5 px-3.5 text-xs rounded-2xl bg-red-500/10 text-red-600 dark:text-red-300"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="flex items-start gap-2 py-2.5 px-3.5 text-xs rounded-2xl bg-zinc-200/70 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 font-mono"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{successMsg}</p>
        </div>
      )}

      {!token ? (
        <div className="space-y-4 text-xs text-zinc-500 dark:text-zinc-400">
          <p>
            Reset token was not found. Please request a new reset link from the
            sign-in page.
          </p>
          <Link
            href="/?auth=forgot"
            className="inline-flex items-center justify-center gap-2 px-6 h-11 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider"
          >
            <span>Request New Link</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={peekNewPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className={inputCls}
              />
              <button
                type="button"
                aria-label={
                  peekNewPassword ? "Hide new password" : "Show new password"
                }
                onClick={() => setPeekNewPassword(!peekNewPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition"
              >
                {peekNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

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

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={peekConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className={inputCls}
              />
              <button
                type="button"
                aria-label={
                  peekConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                onClick={() => setPeekConfirmPassword(!peekConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition"
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
            className="w-full h-12 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50"
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

      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>
      <Suspense
        fallback={
          <div
            className="w-full max-w-md space-y-5"
            role="status"
            aria-label="Loading password reset form"
          >
            <div className="h-6 w-24 skeleton-block" />
            <div className="h-8 w-48 skeleton-block" />
            <div className="space-y-3 pt-2">
              <div className="h-12 w-full skeleton-block" />
              <div className="h-12 w-full skeleton-block" />
              <div className="h-12 w-full skeleton-block" />
            </div>
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
