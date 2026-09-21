import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DataStructureDirectory from "./DataStructureDirectory";

afterEach(cleanup);

describe("DataStructureDirectory (/ds)", () => {
  test("opens with the console page header before the ledger", () => {
    render(
      <MemoryRouter>
        <DataStructureDirectory />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /Master every/ })).toBeInTheDocument();
    expect(screen.getAllByText(/problem corpus \/ taxonomy/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Domains/)).toBeInTheDocument();
    expect(screen.getByText(/corpus synced/)).toBeInTheDocument();
  });

  test("renders the ledger exactly once, routing into /ds/:slug consoles", () => {
    render(
      <MemoryRouter>
        <DataStructureDirectory />
      </MemoryRouter>,
    );
    // The internal CategoryDirectory header is suppressed — no duplicate.
    expect(screen.getAllByText(/Master every/)).toHaveLength(1);
    const section = screen.getByRole("region", { name: "Problem categories" });
    const links = within(section).getAllByRole("link");
    expect(links).toHaveLength(8);
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/ds/tree");
    expect(hrefs).toContain("/ds/greedy");
  });
});
