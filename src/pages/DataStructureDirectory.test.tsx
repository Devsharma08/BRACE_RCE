import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DataStructureDirectory from "./DataStructureDirectory";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { username: "TEST" } }),
}));

vi.mock("../hooks/useAnalytics", () => ({
  useAnalytics: () => ({ data: null }),
}));

vi.mock("../hooks/useDsTopicProgress", () => ({
  useDsTopicProgress: () => ({
    bySlug: {},
    items: [],
    isLoading: false,
  }),
}));

afterEach(cleanup);

describe("DataStructureDirectory (/ds)", () => {
  test("opens with the console page header before the ledger", () => {
    render(
      <MemoryRouter>
        <DataStructureDirectory />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /Master every/ })).toBeInTheDocument();
    expect(screen.getAllByText(/DS \/\/ corpus taxonomy/).length).toBeGreaterThan(0);
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
