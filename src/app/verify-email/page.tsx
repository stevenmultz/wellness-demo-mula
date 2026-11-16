import Link from "next/link";
import { wellnessVerifyEmailToken } from "@/wellness/actions/auth";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  const token = searchParams?.token || "";
  const result = token
    ? await wellnessVerifyEmailToken(token)
    : { success: false, message: "Verification token is missing from the link." };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-8 shadow-sm space-y-5 text-center">
        <span className="inline-block text-[11px] font-mono uppercase tracking-widest text-zinc-500">
          Email Verification
        </span>
        <h1 className="text-xl font-bold tracking-tight">
          {result.success ? "Email Verified" : "Verification Failed"}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {result.message}
        </p>
        <div className="pt-2 flex flex-col gap-2.5">
          <Link
            href={result.success ? "/dashboard" : "/"}
            className="w-full py-3 px-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold transition hover:opacity-90"
          >
            {result.success ? "Go to Dashboard" : "Back to Home"}
          </Link>
        </div>
      </div>
    </main>
  );
}
