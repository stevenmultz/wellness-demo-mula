"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { wellnessVerifyEmailToken } from "@/wellness/actions/auth";
import { isAdminRole } from "@/wellness/security/roles";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const [state, setState] = useState<{
    loading: boolean;
    success: boolean;
    message: string;
    role?: string;
  }>(() =>
    token
      ? { loading: true, success: false, message: "Verifying your email address..." }
      : { loading: false, success: false, message: "Verification token is missing from the link." }
  );
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;
    wellnessVerifyEmailToken(token)
      .then((res) => {
        setState({
          loading: false,
          success: res.success,
          message:
            res.message ||
            (res.success
              ? "Email verified successfully! Your account is active."
              : "Verification failed."),
          role: res.data?.role,
        });
      })
      .catch(() => {
        setState({
          loading: false,
          success: false,
          message: "Failed to verify email address. Please try again.",
        });
      });
  }, [token]);

  const targetHref = state.success
    ? isAdminRole(state.role)
      ? "/admin"
      : "/dashboard"
    : "/";

  return (
    <div className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-8 shadow-sm space-y-5 text-center">
      <span className="inline-block text-[11px] font-mono uppercase tracking-widest text-zinc-500">
        Email Verification
      </span>
      <div className="flex justify-center">
        {state.loading ? (
          <Loader2 className="w-7 h-7 animate-spin text-zinc-600 dark:text-zinc-300" />
        ) : state.success ? (
          <CheckCircle2 className="w-7 h-7 text-zinc-900 dark:text-white" />
        ) : (
          <AlertCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
        )}
      </div>
      <h1 className="text-xl font-bold tracking-tight">
        {state.loading
          ? "Verifying Email..."
          : state.success
            ? "Email Verified"
            : "Verification Failed"}
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {state.message}
      </p>
      {!state.loading && (
        <div className="pt-2 flex flex-col gap-2.5">
          <Link
            href={targetHref}
            className="w-full py-3 px-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold transition hover:opacity-90"
          >
            {state.success
              ? isAdminRole(state.role)
                ? "Go to Admin Console"
                : "Go to Dashboard"
              : "Back to Sign In"}
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 p-6">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-8 shadow-sm space-y-4 text-center">
            <div className="h-4 w-32 mx-auto skeleton-block" />
            <div className="h-7 w-48 mx-auto skeleton-block" />
            <div className="h-10 w-full skeleton-block" />
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}
