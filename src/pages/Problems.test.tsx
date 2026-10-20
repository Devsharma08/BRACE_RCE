import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { api } from "../config/api";
import Problems from "./Problems";

vi.mock("../config/api", () => ({ api: { get: vi.fn() } }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { username: "TEST" }, isAuthenticated: true, isAdmin: false, isLoading: false }),
}));
vi.mock("../hooks/useAnalytics", () => ({ useAnalytics: () => ({ data: undefined }) }));
vi.mock("../hooks/useDsTopicProgress", () => ({
  useDsTopicProgress: () => ({
    bySlug: {
      array: { total: 3, completed: 1, problemIds: ["problem-1", "problem-2", "problem-3"] },
    },
  }),
}));
vi.mock("../hooks/useSocketInvalidation", () => ({
  useSocketInvalidation: () => undefined,
}));
vi.mock("../hooks/useDebounce", () => ({ useDebounce: (v: string) => v }));

const problems = Array.from({ length: 16 }, (_, index) => ({
  id: `problem-${index + 1}`,
  name: `Challenge ${index + 1}`,
  problem_number: index + 1,
  difficulty_level: index === 15 ? "HARD" : "EASY",
  isSolved: index === 0,
  attempts: index === 0 ? 1 : 0,
  lastLanguage: "javascript",
}));
let client: QueryClient;

function renderProblems() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/problems"]}>
        <Routes>
          <Route path="/problems" element={<Problems />} />
          <Route path="/terminal" element={<p>Terminal destination</p>} />
          <Route path="/ds" element={<p>DS directory</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockResolvedValue({ data: { problems } });
});
afterEach(() => {
  cleanup();
  client?.clear();
});

const getTable = () =>
  within(screen.getByRole("region", { name: "Problem index" })).getByRole("table");

const waitForTable = async () => {
  const table = getTable();
  await within(table).findByText("Challenge 1");
  return table;
};

describe("Problems page (redesigned)", () => {
  test("shows skeleton rows while the catalog is still loading", async () => {
    // Hold the request open so the pending state is observable. `placeholderData:
    // []` puts the query into success status immediately (React Query v5), which
    // is exactly why the skeleton must not be gated on `isLoading` alone.
    let resolveProblems!: (value: { data: { problems: typeof problems } }) => void;
    vi.mocked(api.get).mockImplementation(
      () =>
        new Promise<{ data: { problems: typeof problems } }>((resolve) => {
          resolveProblems = resolve;
        }),
    );

    renderProblems();
    // Wait for React Query to kick off the fetch (it starts in an effect).
    await waitFor(() => expect(resolveProblems).toBeDefined());

    // First render: header row + PAGE_SIZE (8) skeleton rows, no empty-state text.
    const table = getTable();
    expect(within(table).getAllByRole("row")).toHaveLength(9);
    expect(screen.queryByText(/No problems match this filter/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Problem index" }),
    ).toHaveAttribute("aria-busy", "true");

    resolveProblems({ data: { problems } });
    const resolvedTable = await waitForTable();
    expect(within(resolvedTable).getAllByRole("row")).toHaveLength(9);
    expect(
      screen.getByRole("region", { name: "Problem index" }),
    ).toHaveAttribute("aria-busy", "false");
  });

  test("renders the problem index table (first page)", async () => {
    renderProblems();
    const table = await waitForTable();
    const rows = within(table).getAllByRole("row");
    // header row + 8 problems on page 1 (PAGE_SIZE = 8)
    expect(rows).toHaveLength(9);
    expect(within(table).getByText("Challenge 8")).toBeInTheDocument();
    expect(within(table).getByText("Solved")).toBeInTheDocument();
    expect(screen.getByText("Page 1 / 2")).toBeInTheDocument();
  });

  test("shows solved/open status per row", async () => {
    renderProblems();
    const table = await waitForTable();
    expect(within(table).getByText("Solved")).toBeInTheDocument();
  });

  test("filters problems by search query", async () => {
    renderProblems();
    await waitForTable();
    const search = screen.getByRole("textbox", { name: "Search problems" });
    fireEvent.change(search, { target: { value: "15" } });
    const table = getTable();
    expect(await within(table).findByText("Challenge 15")).toBeInTheDocument();
    expect(within(table).queryByText("Challenge 16")).not.toBeInTheDocument();
  });

  test("filters problems by difficulty", async () => {
    renderProblems();
    await waitForTable();
    const difficulty = screen.getByRole("combobox", { name: "Filter by difficulty" });
    fireEvent.change(difficulty, { target: { value: "Easy" } });
    const table = getTable();
    expect(within(table).getByText("Challenge 1")).toBeInTheDocument();
    expect(within(table).queryByText("Challenge 16")).not.toBeInTheDocument();
    fireEvent.change(difficulty, { target: { value: "Hard" } });
    expect(await within(table).findByText("Challenge 16")).toBeInTheDocument();
    expect(within(table).queryByText("Challenge 1")).not.toBeInTheDocument();
  });

  test("opens a problem in the terminal from a table row", async () => {
    renderProblems();
    const table = await waitForTable();
    const row = within(table).getByText("Challenge 1").closest("tr")!;
    fireEvent.click(row);
    expect(await screen.findByText("Terminal destination")).toBeInTheDocument();
  });

  test("paginates to the second page", async () => {
    renderProblems();
    await waitForTable();
    const region = screen.getByRole("region", { name: "Problem index" });
    const table = within(region).getByRole("table");
    expect(within(table).queryByText("Challenge 16")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Next page"));
    expect(await within(table).findByText("Challenge 16")).toBeInTheDocument();
    expect(within(region).getByText("Page 2 / 2")).toBeInTheDocument();
  });
});
