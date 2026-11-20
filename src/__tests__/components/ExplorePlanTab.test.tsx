// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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

  it("renders compact category names, image+name+price plan cards, logo-only community cards, and omits removed eyebrows/descriptions", async () => {
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

    // Removed headers/eyebrows/descriptions/buttons are not rendered
    expect(screen.queryByText("All Plans")).toBeNull();
    expect(screen.queryByText("Full Online Programs")).toBeNull();
    expect(screen.queryByText("Explore Community")).toBeNull();
    expect(screen.queryByText(/100% online training/i)).toBeNull();
    expect(screen.queryByText(/Online training paired with in-person/i)).toBeNull();
    expect(screen.queryByText(/Flexible • Anytime/i)).toBeNull();
    expect(screen.queryByText(/Scheduled & Onsite/i)).toBeNull();
    expect(screen.queryByText(/Verified Communities/i)).toBeNull();

    // Sports Category card shows ONLY category name (compact chip)
    const pilatesBtn = await screen.findByRole("button", { name: "Pilates" });
    expect(pilatesBtn.textContent?.trim()).toBe("Pilates");

    // Online card shows ONLY Online + category badges + title + price (no commitment badge, no "Full")
    const onlineHeading = screen.getByRole("heading", { name: "Morning Pilates Reset" });
    const onlineCard = onlineHeading.closest("button");
    expect(onlineCard?.querySelector("img")).not.toBeNull();
    expect(onlineCard?.textContent).toContain("Morning Pilates Reset");
    expect(onlineCard?.textContent).toContain("250.000");
    expect(onlineCard?.textContent).toContain("Online");
    expect(onlineCard?.textContent).not.toContain("Full Online");
    expect(onlineCard?.textContent).not.toContain("20m/day");
    expect(onlineCard?.textContent).toContain("Pilates");
    expect(onlineCard?.textContent).not.toContain("Coach Sarah");

    // Hybrid card shows ONLY Hybrid + category badges + title + price (no city badge)
    const hybridHeading = screen.getByRole("heading", { name: "Senopati Padel Cohort" });
    const hybridCard = hybridHeading.closest("button");
    expect(hybridCard?.querySelector("img")).not.toBeNull();
    expect(hybridCard?.textContent).toContain("Senopati Padel Cohort");
    expect(hybridCard?.textContent).toContain("650.000");
    expect(hybridCard?.textContent).toContain("Hybrid");
    expect(hybridCard?.textContent).not.toContain("Jakarta Selatan");
    expect(hybridCard?.textContent).toContain("Padel");
    expect(hybridCard?.textContent).not.toContain("Coach Dimas");

    // Community card uses logo as box background (no overlaid inner img, no visible text)
    const commBtn = screen.getByRole("button", { name: "ZERA Sanctuary" });
    expect(commBtn.style.backgroundImage).toContain("/logo-zera.png");
    expect(commBtn.querySelector("img")).toBeNull();
    expect(commBtn.textContent?.trim()).toBe("");

    await waitFor(() => {
      expect(screen.getByText("Explore All Programs")).toBeDefined();
      expect(screen.getByText("Online Programs")).toBeDefined();
      expect(screen.getByText("Hybrid Programs")).toBeDefined();
      expect(screen.getByText("See all sports category")).toBeDefined();
      // Only the 2 top header "See All" buttons (trailing cards removed)
      expect(screen.getAllByRole("button", { name: /^See All$/i }).length).toBe(2);
      expect(screen.getByText("See all community")).toBeDefined();
    });
  });

  it("supports Sort by dropdown and compact Type, Sports, Community, and City filter dropdowns in catalog mode", async () => {
    window.scrollTo = vi.fn();
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => samplePayload,
    } as Response);

    const onEditProfile = vi.fn();
    const onShareProgress = vi.fn();
    const onAddAccount = vi.fn();
    const onLogout = vi.fn();

    render(
      <LocaleProvider initialLocale="en">
        <ExplorePlanTab
          headerVisible={true}
          profileName="Steven"
          profileEmail="steven@zera.id"
          profileMenuActions={{
            onEditProfile,
            onShareProgress,
            onAddAccount,
            onLogout,
          }}
          onRegister={vi.fn()}
          onViewDetails={vi.fn()}
          onOpenPlan={vi.fn()}
          registeringId={null}
        />
      </LocaleProvider>
    );

    // Header profile dropdown opens standard options
    const profileTrigger = await screen.findByRole("button", { name: /Profile/i });
    fireEvent.click(profileTrigger);
    expect(screen.getByRole("menuitem", { name: /Edit Profile/i })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: /Share Progress/i })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: /Add Account/i })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: /Log Out/i })).toBeDefined();
    fireEvent.click(screen.getByRole("menuitem", { name: /Share Progress/i }));
    expect(onShareProgress).toHaveBeenCalledTimes(1);

    // Open catalog via "See All" on Online Programs
    const seeAllButtons = screen.getAllByRole("button", { name: /^See All$/i });
    fireEvent.click(seeAllButtons[0]);

    // Header has "Sort by" button instead of "Filters"
    const sortBtn = await screen.findByRole("button", { name: /Sort by/i });
    expect(screen.queryByRole("button", { name: /^Filters$/i })).toBeNull();

    // Type dropdown is pre-set to "Online"
    const typeDropdownBtn = screen.getByRole("button", { name: /^Online$/i });
    expect(screen.getByRole("heading", { name: "Morning Pilates Reset" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Senopati Padel Cohort" })).toBeNull();

    // Switch Type dropdown to Hybrid
    fireEvent.click(typeDropdownBtn);
    fireEvent.click(screen.getByRole("menuitemradio", { name: /^Hybrid$/i }));
    expect(screen.getByRole("heading", { name: "Senopati Padel Cohort" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Morning Pilates Reset" })).toBeNull();

    // Filter by City dropdown
    fireEvent.click(screen.getByRole("button", { name: /^City$/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Jakarta Selatan" }));
    expect(screen.getByRole("heading", { name: "Senopati Padel Cohort" })).toBeDefined();

    // Reset all filters and sort by Price: High to Low
    fireEvent.click(screen.getByRole("button", { name: /Reset/i }));
    fireEvent.click(sortBtn);
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Price: High to Low/i }));
    const headingsDesc = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headingsDesc).toEqual(["Senopati Padel Cohort", "Morning Pilates Reset"]);

    // Filter by Sports dropdown -> Pilates, then Community dropdown -> ZERA Sanctuary
    fireEvent.click(screen.getByRole("button", { name: /^Sports$/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Pilates" }));
    fireEvent.click(screen.getByRole("button", { name: /^Community$/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /ZERA Sanctuary/i }));
    expect(screen.getByRole("heading", { name: "Morning Pilates Reset" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Senopati Padel Cohort" })).toBeNull();
  });
});
