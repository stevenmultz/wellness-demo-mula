import { redirect } from "next/navigation";
import { getWellnessSession } from "@/wellness/security/session";
import { isAdminRole } from "@/wellness/security/roles";
import { isUserOnboardingComplete } from "@/wellness/validators/auth";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getWellnessSession();

  if (!session) {
    redirect("/?auth=signin");
  }

  if (isAdminRole(session.role)) {
    redirect("/admin");
  }

  if (isUserOnboardingComplete(session)) {
    redirect("/dashboard");
  }

  return (
    <OnboardingWizard
      email={session.email}
      initialFullName={session.fullName}
      initialDateOfBirth={
        session.dateOfBirth ? session.dateOfBirth.toISOString().slice(0, 10) : ""
      }
      initialGender={session.gender}
      initialPhone={session.phone}
      initialCity={session.city}
    />
  );
}
