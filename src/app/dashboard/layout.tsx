import { redirect } from "next/navigation";
import { getWellnessSession } from "@/wellness/security/session";
import { isUserOnboardingComplete } from "@/wellness/validators/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getWellnessSession();

  if (!session) {
    redirect("/?auth=signin&target=dashboard");
  }

  if (!isUserOnboardingComplete(session)) {
    redirect("/onboarding");
  }

  return <>{children}</>;
}
