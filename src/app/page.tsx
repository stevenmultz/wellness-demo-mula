import { Suspense } from "react";
import { getWellnessSession } from "@/wellness/security/session";
import { LandingClient } from "@/components/home/LandingClient";
import { BmsLogoLoading } from "@/components/common/BmsLogoLoading";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <Suspense fallback={<BmsLogoLoading />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const sessionUser = await getWellnessSession();

  return <LandingClient sessionUser={sessionUser} />;
}
