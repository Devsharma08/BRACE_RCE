import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { api } from "../config/api";
import { Problems } from "./Problems";

vi.mock("../config/api", () => ({ api: { get: vi.fn() } }));
// Still needed: something in the Problems render tree consumes auth.
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { username: "TEST" }, isAuthenticated: true, isAdmin: false, isLoading: false }),
}));
vi.mock("../hooks/useLeaderboard", () => ({ useMyRating: () => ({ data: { rating: 1200 } }) }));
// DashboardSidebar / MobileBottomNav are no longer rendered here — the console
// shell (src/pages/ConsoleShell.tsx) owns both, so they need no mock.

vi.mock("../hooks/useSocketInvalidation", () => ({
  useSocketInvalidation: () => undefined,
}));

// Give the topic tiles real progress so the "solved out of total" figure the
// bento tile renders is assertable rather than always 0/0. problem-1 is the
// only solved problem in the fixture, so Arrays expects exactly 1 of 3.
vi.mock("../hooks/useDsTopicProgress", () => ({
  useDsTopicProgress: () => ({
    bySlug: {
      array: { problemIds: ["problem-1", "problem-2", "problem-3"] },
    },
  }),
}));

const problems = Array.from({ length: 16 }, (_, index) => ({
  id: `problem-${index + 1}`,
  name: `Challenge ${index + 1}`,
  problem_number: index + 1,
  difficulty_level: index === 15 ? "HARD" : "EASY",
  isSolved: index === 0,
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

/**
 * The index has two views and TABLE is the default, so the card-view tests
 * switch to it explicitly. Without this they would assert against a region that
 * is not mounted, and every card behaviour would silently go untested.
 */
const switchToCardView = async () => {
  const cardToggle = await screen.findByRole("button", { name: /cards/i });
  fireEvent.click(cardToggle);
  return screen.findByRole("region", { name: "Problem cards" });
};

const switchToTableView = async () => {
  const tableToggle = await screen.findByRole("button", { name: /table/i });
  fireEvent.click(tableToggle);
  return screen.findByRole("region", { name: "Problem index" });
};

describe("Problems filtering and pagination", () => {
  test("puts EVERY data structure inside one Data structure progress panel", async () => {
    renderProblems();
    await screen.findByText("Challenge 1");

    const overview = screen.getByRole("region", { name: "Training overview" });
    const panel = screen.getByRole("region", { name: "Data structure progress" });

    // The eight structure rows (one per /ds page) all live in the panel...
    const structureLinks = (container: HTMLElement) =>
      within(container)
        .getAllByRole("link")
        .filter((link) => (link.getAttribute("href") ?? "").startsWith("/ds/"));
    expect(structureLinks(panel)).toHaveLength(8);
    // ...and the overview holds no others — nothing is duplicated as a tile.
    expect(structureLinks(overview)).toHaveLength(8);
    expect(overview.children[0]).toHaveClass("md:grid-cols-2"); // bento tiles
    expect(overview.children[1]).toBe(panel); // panel sits to their right

    // Arrays row: link target, accessible name, teaser copy, solved/total.
    const arraysRow = screen.getByRole("link", { name: /Arrays & Strings/ });
    expect(arraysRow).toHaveAttribute("href", "/ds/array");
    // problem-1 is the only solved id in the mocked bySlug, and it is three long.
    expect(arraysRow).toHaveAccessibleName("Arrays & Strings: 1 of 3 problems solved");
    expect(within(arraysRow).getByText("1")).toBeInTheDocument();
    expect(within(arraysRow).getByText("/3")).toBeInTheDocument();
    expect(within(panel).getByText("Indexing, traversal, and window patterns.")).toBeInTheDocument();
  });

  test("keeps the mock's two-column overview: tiles left, DS panel right", async () => {
    renderProblems();
    await screen.findByText("Challenge 1");

    const overview = screen.getByRole("region", { name: "Training overview" });
    expect(overview).toHaveClass("lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]");

    const hero = screen.getByText("Choose a pattern to practice.").closest("article") as HTMLElement;
    expect(hero).toHaveClass("md:col-span-2", "min-h-[260px]", "p-5");
    expect(within(hero).getByRole("link", { name: /Browse patterns/ })).toHaveAttribute("href", "/ds");

    const route = screen.getByText("Study route").closest("article") as HTMLElement;
    expect(route).toHaveClass("min-h-[180px]");
    const signal = screen.getByText("Training signal").closest("article") as HTMLElement;
    expect(signal).toHaveClass("min-h-[180px]");
    expect(signal).not.toHaveClass("md:col-span-2");
  });

  test("stretches both overview columns to the same height", async () => {
    renderProblems();
    await screen.findByText("Challenge 1");

    const overview = screen.getByRole("region", { name: "Training overview" });
    const panel = screen.getByRole("region", { name: "Data structure progress" });

    // Neither column opts out of the grid's stretch, so both end level
    // instead of leaving the tile column ~200px short of the panel.
    expect(overview).not.toHaveClass("lg:items-start");
    expect(panel).not.toHaveClass("self-start");

    // The tile column hands its spare height to the tiles (3fr/2fr, floors
    // held by min-h) rather than parking it under them...
    expect(overview.children[0]).toHaveClass("md:grid-rows-[3fr_2fr]");
    // ...and the panel spreads its rows when the left column is the taller one.
    expect(panel).toHaveClass("flex", "flex-col");
    expect(within(panel).getAllByRole("link")[0]).toHaveClass("flex-1");
  });

  test("uses the unified raised surface for the problem index", async () => {
    renderProblems();
    await screen.findByText("Challenge 1");
    const index = await switchToTableView();
    expect(index).toHaveClass("bg-raised");
    expect(index).not.toHaveClass("bg-slate-950/40");

    // Mock column heads: # / Problem / Difficulty / Domain (+ Open action).
    expect(within(index).getByText("Problem")).toBeInTheDocument();
    expect(within(index).getByText("Difficulty")).toBeInTheDocument();
    expect(within(index).getByText("Domain")).toBeInTheDocument();
    expect(within(index).getByText("16 matches")).toBeInTheDocument();
  });

  test("renders the table by default and swaps to the card grid on request", async () => {
    renderProblems();
    await screen.findByText("Challenge 1");

    // The table is the landing view — no card panel is mounted yet.
    const index = screen.getByRole("region", { name: "Problem index" });
    expect(within(index).getByText("Challenge 1")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Problem cards" })).not.toBeInTheDocument();

    // Switching views swaps the panels.
    await switchToCardView();
    expect(screen.queryByRole("region", { name: "Problem index" })).not.toBeInTheDocument();
  });

  test("remembers the chosen view across a remount", async () => {
    renderProblems();
    await screen.findByText("Challenge 1");
    await switchToCardView();
    expect(screen.getByRole("region", { name: "Problem cards" })).toBeInTheDocument();

    // Unmount and mount again: the choice must come back. A ref would NOT
    // survive this — refs are discarded on unmount.
    cleanup();
    client.clear();
    renderProblems();
    expect(await screen.findByRole("region", { name: "Problem cards" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Problem index" })).not.toBeInTheDocument();
  });

  test("cards show solved state, difficulty and the case count from the problem object", async () => {
    renderProblems();
    await screen.findByText("Challenge 1");
    const cards = await switchToCardView();

    // A card links straight into the terminal.
    expect(within(cards).getByRole("link", { name: /Challenge 1, EASY, solved/i })).toHaveAttribute(
      "href",
      "/terminal?id=problem-1",
    );

    // problem-1 is the fixture's only solved entry.
    expect(within(cards).getByText("Solved")).toBeInTheDocument();
    // Difficulty comes straight off the row.
    expect(within(cards).getAllByText("EASY").length).toBeGreaterThan(0);
    // 15 per page: the first card is Challenge 1, the sixteenth is not rendered.
    expect(within(cards).queryByText("Challenge 16")).not.toBeInTheDocument();
  });

  test("paginates 15 rows and resets to page one when difficulty changes", async () => {
    renderProblems();
    await screen.findByText("Challenge 1");
    await switchToTableView();
    expect(api.get).toHaveBeenCalledWith("/problems/system", {
      params: { page: 1, limit: 100 },
    });
    // The mock returns 16 rows (< page size 100), so the pagination loop must
    // stop after the first request instead of fetching a phantom page 2.
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Challenge 16")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PREV" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "NEXT" }));
    expect(await screen.findByText("Challenge 16")).toBeInTheDocument();
    expect(screen.queryByText("Challenge 1")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "NEXT" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "EASY" }));
    expect(await screen.findByText("Challenge 1")).toBeInTheDocument();
    expect(screen.queryByText("Challenge 16")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EASY" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "ALL" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "PREV" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "NEXT" })).toBeDisabled();
  });

  test("searches by number and title, resets pagination, and shows empty results", async () => {
    renderProblems();
    await screen.findByText("Challenge 1");
    await switchToTableView();
    fireEvent.click(screen.getByRole("button", { name: "NEXT" }));
    await screen.findByText("Challenge 16");
    const search = screen.getByRole("textbox", { name: "Search problems" });
    fireEvent.change(search, { target: { value: "15" } });
    expect(await screen.findByText("Challenge 15")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PREV" })).toBeDisabled();
    fireEvent.change(search, { target: { value: "cHaLlEnGe 16" } });
    expect(await screen.findByText("Challenge 16")).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "unmatched title" } });
    expect(await screen.findByText("No matching problems")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "NEXT" })).not.toBeInTheDocument();
  });

  test("opens a problem in the terminal from a table row", async () => {
    renderProblems();
    await screen.findByText("Challenge 1");
    await switchToTableView();
    // Whole rows are buttons in this design; the title cell pins the target.
    fireEvent.click(screen.getByText("Challenge 1").closest("button") as HTMLElement);
    expect(await screen.findByText("Terminal destination")).toBeInTheDocument();
  });

  test("opens a problem in the terminal from a bento card", async () => {
    renderProblems();
    await screen.findByText("Challenge 1");
    await switchToCardView();
    fireEvent.click(screen.getByRole("link", { name: /Challenge 1, EASY, solved/i }));
    expect(await screen.findByText("Terminal destination")).toBeInTheDocument();
  });
});
