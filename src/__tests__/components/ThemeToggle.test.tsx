// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockUsePathname } = vi.hoisted(() => ({
  mockUsePathname: vi.fn<() => string>(() => "/"),
}));

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
}));

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

describe("UI Component: ThemeProvider & ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    mockUsePathname.mockReturnValue("/");
  });

  it("toggles between Light and Dark themes, syncing DOM class and localStorage", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const btn = screen.getByRole("button", { name: /toggle visual theme/i });
    expect(btn).toHaveTextContent("Dark");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    await user.click(btn);
    expect(btn).toHaveTextContent("Light");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("wellness-theme")).toBe("dark");

    await user.click(btn);
    expect(btn).toHaveTextContent("Dark");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("wellness-theme")).toBe("light");
  });

  it("enforces Light-only theme on /dashboard routes regardless of saved preference", async () => {
    localStorage.setItem("wellness-theme", "dark");
    document.documentElement.classList.add("dark");
    mockUsePathname.mockReturnValue("/dashboard");

    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const btn = screen.getByRole("button", { name: /toggle visual theme/i });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(btn).toHaveTextContent("Dark");

    // Clicking on /dashboard must keep light mode enforced
    await user.click(btn);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
