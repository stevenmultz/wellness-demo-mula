// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, unoptimized: _unopt, ...rest } = props;
    void _fill;
    void _unopt;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

vi.mock("@/wellness/actions/locale", () => ({
  wellnessSetLocale: vi.fn(async () => ({ success: true })),
}));

import { LocaleProvider } from "@/wellness/i18n/LocaleContext";
import { ExplorePlanTab } from "@/components/dashboard/tabs/ExplorePlanTab";

const samplePayload = {
  success: true,
  categories: ["Pilates", "Yoga", "Padel", "Boxing", "Running", "Tennis"],
  programs: [
    {
      id: "online-1",
      title: "Morning Pilates Reset",
      coverImage: "/test.webp",
      coachName: "Coach Sarah",
      organizationName: "ZERA Sanctuary",
      organizationLogo: "/logo-zera.png",
      organizationVerified: true,
      startDate: null,
      endDate: null,
      registrationDeadline: null,
      price: 250_000,
      durationDays: 14,
      locationType: "ONLINE",
      city: null,
      seatsLeft: 20,
      badge: "Open Registration",
      canEnroll: true,
      enrollmentStatus: null,
      difficultyLevel: "BEGINNER",
      category: "Pilates",
      dailyCommitment: "20m/day",
    },
    {
      id: "hybrid-1",
      title: "Senopati Padel Cohort",
      coverImage: "/pic.webp",
      coachName: "Coach Dimas",
      organizationName: "Senopati Padel Club",
      organizationLogo: "/logo-padel.png",
      organizationVerified: true,
      startDate: "2026-12-01",
      endDate: "2026-12-21",
      registrationDeadline: "2026-11-28",
      price: 650_000,
      durationDays: 21,
      locationType: "HYBRID",
      city: "Jakarta Selatan",
      seatsLeft: 8,
      badge: "Open Registration",
      canEnroll: true,
      enrollmentStatus: null,
      difficultyLevel: "INTERMEDIATE",
      category: "Padel",
      dailyCommitment: "45m/day",
    },
  ],
};

describe("ExplorePlanTab bone structure & minimalist cards", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders bone structure skeletons while initial data is loading", () => {
    vi.spyOn(global, "fetch").mockImplementation(
      () => new Promise(() => {}) as Promise<Response>
    );

    const { container } = render(
      <LocaleProvider initialLocale="en">
        <ExplorePlanTab
          headerVisible={true}
          onRegister={vi.fn()}
          onViewDetails={vi.fn()}
          onOpenPlan={vi.fn()}
          registeringId={null}
        />
      </LocaleProvider>
    );

    expect(container.querySelectorAll(".skeleton-block").length).toBeGreaterThanOrEqual(20);
    expect(screen.queryByText("See all sports category")).toBeNull();
    expect(screen.queryByText("See all full online")).toBeNull();
  });

  it("renders simple category names, image+name+price plan cards, and logo+name community cards when ready", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => samplePayload,
    } as Response);

    render(
      <LocaleProvider initialLocale="en">
        <ExplorePlanTab
          headerVisible={true}
          onRegister={vi.fn()}
          onViewDetails={vi.fn()}
          onOpenPlan={vi.fn()}
          registeringId={null}
        />
      </LocaleProvider>
    );

    // Sports Category card shows ONLY category name (no plan count, no tagline/caption)
    const pilatesBtn = await screen.findByRole("button", { name: "Pilates" });
    expect(pilatesBtn.textContent?.trim()).toBe("Pilates");

    // Full Online card shows image + title + price only (no Coach Sarah or duration badge)
    const onlineHeading = screen.getByRole("heading", { name: "Morning Pilates Reset" });
    const onlineCard = onlineHeading.closest("button");
    expect(onlineCard?.querySelector("img")).not.toBeNull();
    expect(onlineCard?.textContent).toContain("Morning Pilates Reset");
    expect(onlineCard?.textContent).toContain("250.000");
    expect(onlineCard?.textContent).not.toContain("Coach Sarah");

    // Hybrid card shows image + title + price only (no Coach Dimas, city, or spots count)
    const hybridHeading = screen.getByRole("heading", { name: "Senopati Padel Cohort" });
    const hybridCard = hybridHeading.closest("button");
    expect(hybridCard?.querySelector("img")).not.toBeNull();
    expect(hybridCard?.textContent).toContain("Senopati Padel Cohort");
    expect(hybridCard?.textContent).toContain("650.000");
    expect(hybridCard?.textContent).not.toContain("Coach Dimas");
    expect(hybridCard?.textContent).not.toContain("Jakarta Selatan");

    // Community card shows logo + community name only (no plan counts or badges)
    const commHeading = screen.getByRole("heading", { name: "ZERA Sanctuary" });
    const commCard = commHeading.closest("button");
    expect(commCard?.querySelector("img")).not.toBeNull();
    expect(commCard?.textContent?.trim()).toBe("ZERA Sanctuary");

    await waitFor(() => {
      expect(screen.getByText("See all sports category")).toBeDefined();
      expect(screen.getByText("See all full online")).toBeDefined();
      expect(screen.getByText("See all hybrid")).toBeDefined();
      expect(screen.getByText("See all community")).toBeDefined();
    });
  });
});
