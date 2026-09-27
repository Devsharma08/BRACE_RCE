import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Footer } from "./Footer";

afterEach(cleanup);

test("renders the system footer with branding and navigation links", () => {
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
  const footer = within(screen.getByRole("contentinfo"));
  const wordmark = footer.getByText(
    (_, element) =>
      element?.tagName === "P" &&
      element.textContent === "BRACE.RCE" &&
      element.className.includes("text-fg"),
  );
  expect(wordmark).toBeInTheDocument();
  expect(footer.getByText("BRACE RCE — built with care by Dev Sharma")).toBeVisible();
  expect(footer.getByText(/built from a DSA journey/)).toBeVisible();
  expect(footer.getByRole("link", { name: /Enter system/ })).toHaveAttribute("href", "/terminal");
  expect(footer.getByRole("link", { name: /Source/ })).toHaveAttribute(
    "href",
    "https://github.com/Devsharma08/BRACE_RCE",
  );
  expect(footer.queryByText(/PING|SSL SECURED|v2\.4/i)).not.toBeInTheDocument();
});

test("compact variant stays a slim personal-branding strip", () => {
  render(
    <MemoryRouter>
      <Footer variant="compact" />
    </MemoryRouter>,
  );
  const footer = within(screen.getByRole("contentinfo"));
  expect(footer.getByText("BRACE RCE / built by Dev Sharma")).toBeVisible();
  expect(footer.getByText("DSA journey × web development")).toBeVisible();
  expect(footer.queryAllByRole("link")).toHaveLength(0);
});

/**
 * ConsoleShell mounts a FIXED rail and a FIXED mobile bottom nav, but Layout
 * renders the footer outside that shell — so the footer must repeat both
 * offsets itself or the rail paints over its left edge (the "trimmed"
 * wordmark) and the nav over the copyright row.
 */
test("offsetRail shifts the full footer clear of the fixed rail and bottom nav", () => {
  render(
    <MemoryRouter>
      <Footer offsetRail />
    </MemoryRouter>,
  );
  const footerElement = screen.getByRole("contentinfo");
  const footer = within(footerElement);
  const wordmark = footer.getByText(
    (_, element) =>
      element?.tagName === "P" &&
      element.textContent === "BRACE.RCE" &&
      element.className.includes("text-fg"),
  );
  // Rail: left margin AND a matching width so the footer lands in the content
  // column instead of overflowing to the right.
  expect(footerElement.className).toContain("md:ml-[var(--sidebar-width)]");
  expect(footerElement.className).toContain(
    "md:w-[calc(100%_-_var(--sidebar-width))]",
  );
  // Bottom nav: extra clearance that md:pb-* removes once the nav is hidden.
  expect(footerElement.className).toContain(
    "pb-[calc(3.5rem_+_var(--mobile-bottom-nav-height))]",
  );
  expect(footerElement.className).toContain("md:pb-14");
  // Narrower column → the watermark tracks the footer, not the viewport.
  expect(wordmark.className).toContain("text-[clamp(3.8rem,8.5vw,8rem)]");
  expect(wordmark.className).not.toContain("text-[clamp(3.8rem,12vw,9rem)]");
});

test("without offsetRail the full footer keeps its marketing-scale layout", () => {
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
  const footerElement = screen.getByRole("contentinfo");
  const wordmark = within(footerElement).getByText(
    (_, element) =>
      element?.tagName === "P" &&
      element.textContent === "BRACE.RCE" &&
      element.className.includes("text-fg"),
  );
  expect(footerElement.className).not.toContain("md:ml-[var(--sidebar-width)]");
  expect(footerElement.className).not.toContain(
    "md:w-[calc(100%_-_var(--sidebar-width))]",
  );
  expect(footerElement.className).not.toContain(
    "var(--mobile-bottom-nav-height)",
  );
  expect(wordmark.className).toContain("text-[clamp(3.8rem,12vw,9rem)]");
});

test("offsetRail applies the same offsets to the compact variant", () => {
  render(
    <MemoryRouter>
      <Footer variant="compact" offsetRail />
    </MemoryRouter>,
  );
  const footer = screen.getByRole("contentinfo");
  expect(footer.className).toContain("md:ml-[var(--sidebar-width)]");
  expect(footer.className).toContain("md:w-[calc(100%_-_var(--sidebar-width))]");
  expect(footer.className).toContain(
    "pb-[calc(1rem_+_var(--mobile-bottom-nav-height))]",
  );
  expect(footer.className).toContain("md:pb-4");
  // Compact has no watermark, so the scaling class must not leak in.
  expect(footer.className).not.toContain("clamp(");
});
