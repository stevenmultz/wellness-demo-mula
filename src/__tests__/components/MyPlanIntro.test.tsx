// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/wellness/actions/locale", () => ({
  wellnessSetLocale: vi.fn(async () => ({ success: true })),
}));

import { LocaleProvider } from "@/wellness/i18n/LocaleContext";
import { MyPlanIntro } from "@/components/dashboard/tabs/my-plan/MyPlanIntro";
import type { MyPlanIndexItem } from "@/components/dashboard/tabs/my-plan/myPlanUtils";

const samplePlans: MyPlanIndexItem[] = [
  {
    programId: "prog-1",
    title: "Morning Mobility Protocol",
    coachName: "Sarah",
    organizationName: "ZERA Sanctuary",
    coverImage: "/test.webp",
    dayCount: 14,
    startDate: null,
    endDate: null,
    locationType: "ONLINE",
    isUpcoming: false,
    isCompleted: false,
    completedDays: 7,
    totalDays: 14,
    currentDayNumber: 8,
    todayDayType: "TRAINING_DAY",
    pendingTasksCount: 2,
  },
  {
    programId: "prog-2",
    title: "Senopati Padel Cohort",
    coachName: "Dimas",
    organizationName: "Senopati Padel Club",
    coverImage: "/pic.webp",
    dayCount: 21,
    startDate: "2026-12-01",
    endDate: "2026-12-21",
    locationType: "HYBRID",
    city: "Jakarta Selatan",
    isUpcoming: true,
    isCompleted: false,
    completedDays: 0,
    totalDays: 21,
    currentDayNumber: 0,
    pendingTasksCount: 0,
  },
];

describe("MyPlanIntro redesigned Home first page", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders user profile card with editable banner, avatar, and immediate enrolled programs with index switcher", () => {
    const onSelectPlan = vi.fn();
    const onEditProfile = vi.fn();

    render(
      <LocaleProvider initialLocale="en">
        <MyPlanIntro
          userId="user-1"
          userName="Steven Tan"
          userEmail="steven@zera.id"
          userAvatarUrl="/coach.webp"
          userSubtitle="Founder · Jakarta"
          plans={samplePlans}
          onSelectPlan={onSelectPlan}
          onExplore={vi.fn()}
          onEditProfile={onEditProfile}
        />
      </LocaleProvider>
    );

    // Profile card renders user name, subtitle, avatar, and editable banner trigger
    expect(screen.getByRole("heading", { name: "Steven Tan" })).toBeDefined();
    expect(screen.getByText("Founder · Jakarta")).toBeDefined();
    expect(screen.getByAltText("Steven Tan").getAttribute("src")).toBe("/coach.webp");

    // Edit banner modal allows selecting a curated preset and persists it
    fireEvent.click(screen.getByRole("button", { name: /Edit profile banner/i }));
    expect(screen.getByRole("dialog", { name: /Edit Profile Banner/i })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Movement/i }));
    expect(window.localStorage.getItem("zera_profile_banner_v1:user-1")).toBe("/test.webp");

    // Enrolled programs render immediately with titles, progress indicator, and 1 / 2 index
    expect(screen.getByRole("heading", { name: "Morning Mobility Protocol" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Senopati Padel Cohort" })).toBeDefined();
    expect(screen.getByTestId("home-program-index").textContent?.trim()).toBe("1 / 2");
    expect(screen.getByText("50%")).toBeDefined();
    expect(screen.getByText("7/14 days done")).toBeDefined();

    // Switching slide via index tab updates index indicator to 2 / 2
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBe(2);
    fireEvent.click(tabs[1]);
    expect(screen.getByTestId("home-program-index").textContent?.trim()).toBe("2 / 2");

    // Clicking a program card opens it directly
    fireEvent.click(screen.getByRole("heading", { name: "Morning Mobility Protocol" }));
    expect(onSelectPlan).toHaveBeenCalledWith("prog-1");
  });

  it("renders clean empty state CTA when user has no enrolled programs", () => {
    const onExplore = vi.fn();

    render(
      <LocaleProvider initialLocale="en">
        <MyPlanIntro
          userId="user-2"
          userName="New Member"
          userEmail="new@zera.id"
          plans={[]}
          onSelectPlan={vi.fn()}
          onExplore={onExplore}
        />
      </LocaleProvider>
    );

    expect(screen.getByRole("heading", { name: "New Member" })).toBeDefined();
    expect(screen.queryByTestId("home-program-index")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Explore Programs/i }));
    expect(onExplore).toHaveBeenCalledTimes(1);
  });
});
