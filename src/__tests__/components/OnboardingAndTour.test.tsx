// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockReplace, mockRefresh, mockCompleteOnboarding, mockSignOut } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockRefresh: vi.fn(),
  mockCompleteOnboarding: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh, push: vi.fn() }),
}));

vi.mock("@/wellness/actions/locale", () => ({
  wellnessSetLocale: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/wellness/actions/account", () => ({
  wellnessCompleteOnboarding: mockCompleteOnboarding,
}));

vi.mock("@/wellness/actions/auth", () => ({
  wellnessSignOut: mockSignOut,
}));

import { LocaleProvider } from "@/wellness/i18n/LocaleContext";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { FirstTimeAppTour } from "@/components/dashboard/FirstTimeAppTour";
import { ZeraLogoLoading } from "@/components/common/ZeraLogoLoading";
import { buildExploreCommunities } from "@/components/dashboard/tabs/explore/ExploreCommunitiesView";
import type { ExploreProgram } from "@/components/dashboard/tabs/explore/exploreFilters";

describe("UI Components: Sequential Onboarding Wizard, First-Time App Tour & White Loading Screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders ZeraLogoLoading with clean white background, black zera.id logo, and no background image", () => {
    const { container } = render(<ZeraLogoLoading />);
    const loader = screen.getByRole("status", { name: /loading/i });
    expect(loader.className).toContain("bg-white");
    expect(loader.className).toContain("text-zinc-950");
    expect(container.querySelector("img")).toBeNull();
    expect(loader.textContent?.toLowerCase()).toContain("zera.id");
  });

  it("walks a new member through all 5 single-field onboarding steps and redirects to /dashboard?welcome=1", async () => {
    const user = userEvent.setup();
    mockCompleteOnboarding.mockResolvedValueOnce({ success: true, message: "Welcome!" });

    render(
      <LocaleProvider initialLocale="en">
        <OnboardingWizard email="fresh@zera.id" />
      </LocaleProvider>
    );

    // Step 1: Full Name (validation blocks empty/short name)
    expect(screen.getByText(/what is your full name/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/at least 3 characters/i);

    await user.type(screen.getByPlaceholderText(/alex rivera/i), "Steven Mulya");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Step 2: Date of Birth
    expect(screen.getByText(/when is your date of birth/i)).toBeInTheDocument();
    const dobInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.type(dobInput, "1999-06-15");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Step 3: Gender
    expect(screen.getByText(/what is your gender/i)).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /^male$/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Step 4: Phone / WhatsApp
    expect(screen.getByText(/phone \/ whatsapp number/i)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/\+6281234567890/i), "+6281290001122");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Step 5: City (quick-pick chip)
    expect(screen.getByText(/which city are you based in/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Jakarta Selatan" }));
    await user.click(screen.getByRole("button", { name: /finish & enter app/i }));

    await waitFor(() => {
      expect(mockCompleteOnboarding).toHaveBeenCalledWith({
        fullName: "Steven Mulya",
        dateOfBirth: "1999-06-15",
        gender: "Male",
        phone: "+6281290001122",
        city: "Jakarta Selatan",
      });
      expect(mockReplace).toHaveBeenCalledWith("/dashboard?welcome=1");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("guides first-time users through the 5-step interactive app tutorial", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();

    render(
      <LocaleProvider initialLocale="en">
        <FirstTimeAppTour isOpen={true} userName="Steven Mulya" onFinish={onFinish} />
      </LocaleProvider>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/hi steven, here's how zera.id works/i)).toBeInTheDocument();

    // Advance through 4 Next clicks to the final slide
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole("button", { name: /^next$/i }));
    }

    expect(screen.getByText(/track body progress & preferences/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /start using app/i }));
    expect(onFinish).toHaveBeenCalledWith("all_plan");
  });

  it("aggregates partner communities accurately for Explore Community section", () => {
    const sample: ExploreProgram[] = [
      {
        id: "p1",
        title: "Pilates Online",
        coverImage: null,
        coachName: "Coach Sarah",
        organizationName: "ZERA Sanctuary",
        organizationLogo: "/icon-192.png",
        organizationVerified: true,
        startDate: null,
        endDate: null,
        registrationDeadline: null,
        price: 200000,
        durationDays: 14,
        locationType: "ONLINE",
        city: null,
        seatsLeft: 10,
        badge: "Open Registration",
        canEnroll: true,
        enrollmentStatus: null,
        difficultyLevel: "BEGINNER",
        category: "Pilates",
        dailyCommitment: "20m/day",
      },
      {
        id: "p2",
        title: "Hybrid Mobility",
        coverImage: null,
        coachName: "Coach Elena",
        organizationName: "ZERA Sanctuary",
        organizationLogo: null,
        organizationVerified: true,
        startDate: "2026-12-01T00:00:00Z",
        endDate: "2026-12-21T00:00:00Z",
        registrationDeadline: "2026-11-28T00:00:00Z",
        price: 350000,
        durationDays: 21,
        locationType: "HYBRID",
        city: "Jakarta Selatan",
        seatsLeft: 5,
        badge: "Open Registration",
        canEnroll: true,
        enrollmentStatus: null,
        difficultyLevel: "INTERMEDIATE",
        category: "Mobility",
        dailyCommitment: "30m/day",
      },
    ];

    const communities = buildExploreCommunities(sample);
    expect(communities).toHaveLength(1);
    expect(communities[0]).toMatchObject({
      name: "ZERA Sanctuary",
      verified: true,
      totalPlans: 2,
      onlineCount: 1,
      hybridCount: 1,
      cities: ["Jakarta Selatan"],
      coaches: ["Coach Sarah", "Coach Elena"],
    });
  });
});
