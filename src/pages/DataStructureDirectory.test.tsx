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
  test("opens with the page header before the ledger", () => {
    render(
      <MemoryRouter>
        <DataStructureDirectory />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /Data structures/ })).toBeInTheDocument();
    expect(screen.getByText(/Learning taxonomy/)).toBeInTheDocument();
    expect(screen.getByText(/Domains/)).toBeInTheDocument();
  });

  test("renders the ledger exactly once, routing into /ds/:slug consoles", () => {
    render(
      <MemoryRouter>
        <DataStructureDirectory />
      </MemoryRouter>,
    );
    const section = screen.getByRole("region", { name: "Problem categories" });
    const links = within(section).getAllByRole("link");
    expect(links).toHaveLength(8);
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/ds/tree");
    expect(hrefs).toContain("/ds/greedy");
  });
});
