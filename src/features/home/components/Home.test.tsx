import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WorkspaceDirectory } from "./WorkspaceDirectory";
import { CategoryDirectory } from "./CategoryDirectory";
import { WorkspaceTeaser } from "./WorkspaceTeaser";
import { services } from "./WorkspaceDirectory";

afterEach(cleanup);

describe("WorkspaceDirectory", () => {
  test("renders five protocol cards linking to live routes", () => {
    render(
      <MemoryRouter>
        <WorkspaceDirectory />
      </MemoryRouter>,
    );
    const section = screen.getByRole("region", { name: "Available workspaces" });
    const links = within(section).getAllByRole("link");
    expect(links).toHaveLength(services.length);

    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/problems");
    expect(hrefs).toContain("/terminal");
    expect(hrefs).toContain("/lobby");
    expect(hrefs).toContain("/friends");
    expect(hrefs).toContain("/dashboard");
  });

  test("keeps the accent vocabulary on the brand and success tokens", () => {
    render(
      <MemoryRouter>
        <WorkspaceDirectory />
      </MemoryRouter>,
    );
    const section = screen.getByRole("region", { name: "Available workspaces" });
    expect(within(section).getByText(/Choose your/)).toBeInTheDocument();
    expect(within(section).getByText("WORKSPACE READY")).toBeInTheDocument();
    expect(within(section).getByText("LOBBY ACTIVE")).toBeInTheDocument();
  });
});

describe("CategoryDirectory", () => {
  test("renders eight category rows routing into their /ds/:slug consoles", () => {
    render(
      <MemoryRouter>
        <CategoryDirectory />
      </MemoryRouter>,
    );
    const section = screen.getByRole("region", { name: "Problem categories" });
    const links = within(section).getAllByRole("link");
    expect(links).toHaveLength(8);
    const hrefs = links.map((l) => l.getAttribute("href"));
    [
      "/ds/tree",
      "/ds/dynamic-programming",
      "/ds/array",
      "/ds/linked-list",
      "/ds/searching",
      "/ds/math",
      "/ds/stack",
      "/ds/greedy",
    ].forEach((href) => expect(hrefs).toContain(href));
  });
});

describe("WorkspaceTeaser", () => {
  test("renders the workspace card routing to /terminal", () => {
    render(
      <MemoryRouter>
        <WorkspaceTeaser />
      </MemoryRouter>,
    );
    expect(screen.getByRole("region", { name: "Workspace" })).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Write, run, and debug code in your sandboxed coding workspace with live diagnostics.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Launch terminal/ }),
    ).toHaveAttribute("href", "/terminal");
    expect(
      screen.getByRole("link", { name: /Open protocol/ }),
    ).toHaveAttribute("href", "/ds");
  });
});

import { QuickNavCards } from "./QuickNavCards";

describe("QuickNavCards", () => {
  test("renders four navigation cards with visible descriptions", () => {
    render(
      <MemoryRouter>
        <QuickNavCards />
      </MemoryRouter>,
    );
        const section = screen.getByRole("region", { name: "Quick navigation" });
    const exploreBtn = within(section).getByRole("link", { name: /Explore/ });
    expect(exploreBtn.getAttribute("href")).toBe("/ds");

    const goCards = within(section).getAllByRole("link", { name: /Go/ });
    expect(goCards).toHaveLength(3);

    const hrefs = [exploreBtn, ...goCards].map((c) => c.getAttribute("href"));
    expect(hrefs).toContain("/battle");
    expect(hrefs).toContain("/ds");
    expect(hrefs).toContain("/friends");
    expect(hrefs).toContain("/problems");

            // Each card exposes its title and description as visible text.
    // The /ds card — verify its description reads cleanly.
    const dsCard = within(section).getByRole("link", { name: /Data structures/ });
    expect(dsCard.textContent).toContain(
      "Eight domains, one execution engine. Open a structure, study the theory and implementations, then solve the matching problems.",
    );
  });
});

