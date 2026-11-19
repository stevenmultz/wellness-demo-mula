// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockCaptureException } = vi.hoisted(() => ({
  mockCaptureException: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mockCaptureException,
}));

import AppError from "@/app/error";

describe("Observability: AppError Boundary Sentry Integration", () => {
  it("reports caught render errors to Sentry and invokes reset on Try Again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    const reset = vi.fn();
    const boom = new Error("Test render failure");

    render(<AppError error={boom} reset={reset} />);

    expect(mockCaptureException).toHaveBeenCalledWith(boom);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
