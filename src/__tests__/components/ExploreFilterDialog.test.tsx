// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/wellness/actions/locale", () => ({
  wellnessSetLocale: vi.fn(async () => ({ success: true })),
}));

import { LocaleProvider } from "@/wellness/i18n/LocaleContext";
import { ExploreFilterDialog, EMPTY } from "@/components/dashboard/tabs/explore/ExploreFilterDialog";
import {
  computeSupportedFilterOptions,
  type ExploreProgram,
  type Filters,
} from "@/components/dashboard/tabs/explore/exploreFilters";

const catalog: ExploreProgram[] = [
  {
    id: "p1",
    title: "Online Breath",
    coverImage: null,
    coachName: "Coach Julian",
    startDate: null,
    endDate: null,
    registrationDeadline: null,
    price: 0,
    durationDays: 7,
    locationType: "ONLINE",
    city: null,
    seatsLeft: 10,
    badge: "Open Registration",
    canEnroll: true,
    enrollmentStatus: null,
    difficultyLevel: "BEGINNER",
    category: "Breathwork",
    dailyCommitment: "15 mins/day",
  },
  {
    id: "p2",
    title: "Hybrid Pilates",
    coverImage: null,
    coachName: "Coach Sarah",
    startDate: "2026-08-01",
    endDate: "2026-08-30",
    registrationDeadline: "2026-07-25",
    price: 350_000,
    durationDays: 30,
    locationType: "HYBRID",
    city: "Jakarta",
    seatsLeft: 5,
    badge: "Open Registration",
    canEnroll: true,
    enrollmentStatus: null,
    difficultyLevel: "ADVANCED",
    category: "Pilates",
    dailyCommitment: "30 mins/day",
  },
];

function DialogHarness({
  onApply,
  onClose,
}: {
  onApply: (filters: Filters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const supported = computeSupportedFilterOptions(catalog);

  const toggle = (key: keyof Filters, val: string) => {
    setDraft((prev) => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter((x) => x !== val) : [...prev[key], val],
    }));
  };

  return (
    <LocaleProvider initialLocale="en">
      <ExploreFilterDialog
        open
        onClose={onClose}
        catalog={catalog}
        supported={supported}
        draft={draft}
        setDraft={setDraft}
        applied={EMPTY}
        onReset={() => setDraft(EMPTY)}
        onApply={() => onApply(draft)}
        onToggle={toggle}
      />
    </LocaleProvider>
  );
}

describe("UI Component: ExploreFilterDialog", () => {
  it("renders accessible modal dialog, dynamically updates preview count, and supports toggle/reset/apply", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onClose = vi.fn();

    render(<DialogHarness onApply={onApply} onClose={onClose} />);

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: /apply · 2 results/i })).toBeInTheDocument();

    const resetBtn = screen.getByRole("button", { name: /reset/i });
    expect(resetBtn).toBeDisabled();

    // Select "Online" format chip -> preview narrows to 1 singular result
    const onlineChip = screen.getByRole("button", { name: "Online" });
    expect(onlineChip).toHaveAttribute("aria-pressed", "false");
    await user.click(onlineChip);

    expect(onlineChip).toHaveAttribute("aria-pressed", "true");
    expect(resetBtn).toBeEnabled();
    expect(screen.getByRole("button", { name: /apply · 1 result$/i })).toBeInTheDocument();

    // Apply emits the selected filter draft
    await user.click(screen.getByRole("button", { name: /apply · 1 result$/i }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ format: ["ONLINE"] }));

    // Reset clears selection back to 2 results
    await user.click(resetBtn);
    expect(resetBtn).toBeDisabled();
    expect(screen.getByRole("button", { name: /apply · 2 results/i })).toBeInTheDocument();
  });
});
