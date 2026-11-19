export const dynamic = "force-dynamic";

/**
 * Intentionally non-blocking layout so Next.js immediately flushes <RootLayout>
 * and <ZeraLogoLoading /> (<Suspense> fallback) in <50ms instead of blocking
 * the initial HTML stream on a database round-trip.
 * Edge authentication is enforced by src/middleware.ts and real-time DB session
 * + onboarding enforcement runs inside DashboardPage's <Suspense> boundary.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
