import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { Footer } from "./Footer";

afterEach(cleanup);

test("shows personal branding without links or system-status clutter", () => {
  render(<Footer />);
  const footer = within(screen.getByRole("contentinfo"));
  expect(footer.getByText("BRACE RCE")).toHaveClass("text-white");
  expect(footer.getByText("Built with love by Dev Sharma.")).toBeVisible();
  expect(footer.getByText(/my DSA journey.*web development skills/)).toBeVisible();
  expect(footer.queryAllByRole("link")).toHaveLength(0);
  expect(footer.queryByText(/PING|SSL SECURED|LIVE|v2\.4/i)).not.toBeInTheDocument();
});
