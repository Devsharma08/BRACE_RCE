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
