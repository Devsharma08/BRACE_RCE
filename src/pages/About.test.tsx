import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import About from "./About";

afterEach(cleanup);

// Mock the real HTTP client so the component talks to a canned stats payload
// instead of a real backend during tests.
vi.mock("../config/api", () => ({
  api: {
    get: vi.fn(() =>
      Promise.resolve({
        data: { status: "success", data: { problems: 124, testCases: 266 } },
      }),
    ),
  },
}));

const renderAbout = () => render(<MemoryRouter><About /></MemoryRouter>);

describe("About", () => {
  test("states what the project is in one heading and one paragraph", () => {
    renderAbout();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /competitive coding with real execution/i,
    );
    // Text-only: no anchor-chip navigation between sections.
    expect(
      screen.queryByRole("navigation", { name: /about page sections/i }),
    ).not.toBeInTheDocument();
  });

  test("lists the measured problem-bank figures", () => {
    renderAbout();
    const facts = within(screen.getByRole("region", { name: "Measured facts" }));
    expect(facts.getByText("Problems")).toBeVisible();
    // Live Prisma counts: 124 problems / 266 test cases (verified against DB).
    expect(facts.getByText("124")).toBeVisible();
    expect(facts.getByText(/266 stored test cases/i)).toBeVisible();
    expect(facts.getByText("5")).toBeVisible();
    // Sandbox verification count, not an invented percentage.
    expect(facts.getByText("1,272")).toBeVisible();
  });

  test("covers every major feature area of the product", () => {
    renderAbout();
    const what = within(screen.getByRole("region", { name: "What the platform does" }));
    for (const group of [
      "Code execution",
      "Problems and grading",
      "Battles",
      "Workspace",
    ]) {
      expect(what.getByText(group)).toBeVisible();
    }
    // The headline capabilities that used to be missing entirely.
    expect(what.getByText(/1v1 matchmaking/i)).toBeVisible();
    expect(what.getByText(/ELO system/i)).toBeVisible();
    expect(what.getByText(/spectate a match/i)).toBeVisible();
    expect(what.getByText(/plagiarism checks/i)).toBeVisible();
    expect(what.getByText(/Monaco editor/i)).toBeVisible();
    expect(what.getByText(/custom problem studio/i)).toBeVisible();
  });

  test("carries no invented percentages or unverifiable claims", () => {
    renderAbout();
    // The previous revision hardcoded "DB pre-flight 98.4%" and similar figures.
    for (const phrase of [
      "98.4",
      "pre-flight",
      "NOMINAL",
      "SANDBOXED",
      "wall clock",
      "flake rate",
    ]) {
      expect(screen.queryByText(new RegExp(phrase, "i"))).not.toBeInTheDocument();
    }
  });

  test("links to the workspace and the repository", () => {
    renderAbout();
    expect(screen.getByRole("link", { name: /open the workspace/i })).toHaveAttribute(
      "href",
      "/terminal",
    );
    const repo = screen.getByRole("link", { name: /source/i });
    expect(repo).toHaveAttribute("href", "https://github.com/Devsharma08/BRACE_RCE");
    expect(repo).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
  });
});
