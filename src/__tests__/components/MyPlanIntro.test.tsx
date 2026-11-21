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

  it("renders current program image banner and direct guides, tasks, metrics widgets with index switcher", () => {
    const onSelectPlan = vi.fn();

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
        />
      </LocaleProvider>
    );

    // Banner renders user name, program title, program image, and index 1 / 2
    expect(screen.getByRole("heading", { name: "Morning Mobility Protocol" })).toBeDefined();
    expect(screen.getByText("Steven Tan")).toBeDefined();
    expect(screen.getByAltText("Morning Mobility Protocol").getAttribute("src")).toBe("/test.webp");
    expect(screen.getByTestId("home-program-index").textContent?.trim()).toBe("1 / 2");

    // Guides, Tasks, Metrics subtabs are directly provided
    expect(screen.getByRole("tab", { name: /Guides/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Tasks/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /Metrics/i })).toBeDefined();

    // Clicking next plan switches index to 2 / 2 and shows the second plan
    fireEvent.click(screen.getByRole("button", { name: /Next plan/i }));
    expect(onSelectPlan).toHaveBeenCalledWith("prog-2");
    expect(screen.getByRole("heading", { name: "Senopati Padel Cohort" })).toBeDefined();
    expect(screen.getByTestId("home-program-index").textContent?.trim()).toBe("2 / 2");
  });

  it("renders dedicated no plan page instructing user to explore when user has no enrolled programs", () => {
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

    expect(screen.getByRole("heading", { name: "No Active Plans Yet" })).toBeDefined();
    expect(screen.getByText(/Visit the Explore tab to discover curated programs/i)).toBeDefined();
    expect(screen.queryByTestId("home-program-index")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Explore Plans/i }));
    expect(onExplore).toHaveBeenCalledTimes(1);
  });
});
