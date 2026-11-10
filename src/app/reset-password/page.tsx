"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { wellnessConfirmPasswordReset } from "@/wellness/actions/auth";
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
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
        }, 1500);
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
    <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center mx-auto">
          <Lock className="w-4 h-4" />
        </div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
          Set New Password
        </h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Enter a new password for your account below.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2.5 p-3.5 text-xs rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          <p className="leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2.5 p-3.5 text-xs rounded-2xl bg-zinc-900/5 dark:bg-white/10 border border-zinc-300 dark:border-white/20 text-zinc-900 dark:text-white font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-zinc-900 dark:text-zinc-200 mt-0.5" />
          <p className="leading-relaxed">{successMsg}</p>
        </div>
      )}

      {!token ? (
        <div className="text-center p-5 glass-panel-subtle rounded-2xl text-zinc-600 dark:text-zinc-400 text-xs space-y-4">
          <p>Reset token was not found. Please request a new reset link from the sign-in dialog.</p>
          <div>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-xl chrome-button text-xs font-medium"
            >
              Back to Home
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={peekNewPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-sm"
              />
              <button
                type="button"
                aria-label={peekNewPassword ? "Hide new password" : "Show new password"}
                onClick={() => setPeekNewPassword(!peekNewPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
              >
                {peekNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={peekConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-sm"
              />
              <button
                type="button"
                aria-label={peekConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                onClick={() => setPeekConfirmPassword(!peekConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
              >
                {peekConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !!successMsg}
            className="w-full py-2.5 px-4 rounded-xl chrome-button text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                Save New Password <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      <div className="text-center pt-3 border-t border-zinc-200 dark:border-white/10">
        <Link
          href="/"
          className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
        >
          &larr; Return to Home
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>
      <Suspense
        fallback={
          <div className="w-full max-w-md glass-panel rounded-3xl p-8 space-y-5" role="status" aria-label="Loading password reset form">
            <div className="w-10 h-10 rounded-xl skeleton-block mx-auto" />
            <div className="space-y-2">
              <div className="h-5 w-40 skeleton-block mx-auto" />
              <div className="h-3.5 w-56 skeleton-block mx-auto" />
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
