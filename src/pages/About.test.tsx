import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import About from "./About";

afterEach(cleanup);

function renderAbout() {
  return render(<MemoryRouter><About /></MemoryRouter>);
}

describe("About", () => {
  test("presents implemented workflows and honest development status", () => {
    renderAbout();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Build your skills.");
    expect(screen.getByText("Active development")).toBeVisible();
    expect(screen.getByText(/my DSA journey meets my web development skills/)).toBeVisible();
    const goals = within(screen.getByRole("region", { name: "Where I want to take this next" }));
    expect(goals.getAllByRole("article")).toHaveLength(4);
    expect(goals.getByText(/not shipped features or release commitments/)).toBeVisible();
    const status = within(screen.getByRole("region", { name: "Built so far. Still getting better." }));
    for (const label of ["Implemented UI", "In progress", "Verification pending"]) {
      expect(status.getByText(label)).toBeVisible();
    }
    expect(status.getByText(/pixel hero keeps its boot and pointer effects/)).toBeVisible();
    expect(status.getByText(/Browser-level checks.*still outstanding/)).toBeVisible();
    expect(screen.queryByText(/PROD DEPLOYED|v2\.4\.0 ONLINE|9 OPERATIONAL|AI Code Diagnostics/)).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  test("omits the workspace rail and points contributors to the current repository", () => {
    renderAbout();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByText("Choose your workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Sign in to enter your workspace")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Launch terminal|Practice problems|Battle arena/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Explore the repository/ })).toHaveAttribute("href", "https://github.com/Devsharma08/BRACE_RCE");
    expect(screen.getByRole("link", { name: /Browse project issues/ })).toHaveAttribute("href", "https://github.com/Devsharma08/BRACE_RCE/issues");
    expect(screen.getByRole("link", { name: /DSA data repository/ })).toHaveAttribute("href", "https://github.com/Devsharma08/DSA-LEETCODE");
    for (const link of screen.getAllByRole("link").filter(link => link.getAttribute("target") === "_blank")) {
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
