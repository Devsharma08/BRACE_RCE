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

describe("Problems filtering and pagination", () => {
  test("bento grid renders topic tiles with the topic left and solved/total right", async () => {
    renderProblems();
    await screen.findByText("Challenge 1");
    // The two former sections are now one bento grid under a single heading.
    expect(screen.getByText("Command deck")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open /ds" })).toHaveAttribute("href", "/ds");

    const arraysTile = screen.getByRole("link", { name: /Arrays & Strings/ });
    expect(arraysTile).toHaveAttribute("href", "/ds/array");
    // Left = topic name, right = "solved/total". problem-1 is the only solved
    // id in the mocked bySlug, and it is three long.
    expect(arraysTile).toHaveAccessibleName("Arrays & Strings: 1 of 3 problems solved");
    expect(within(arraysTile).getByText("1")).toBeInTheDocument();
    expect(within(arraysTile).getByText("/3")).toBeInTheDocument();
  });

  test("bento tiles opt into their own spans so the grid is not a flat row", async () => {
    renderProblems();
    await screen.findByText("Challenge 1");
    const hero = screen.getByText("Choose a pattern to practice.").closest("article");
    expect(hero).toHaveClass("lg:row-span-2", "md:col-span-2");
    const signal = screen.getByText("Training signal").closest("article");
    expect(signal).toHaveClass("lg:col-span-2");
    const topicTile = screen.getByRole("link", { name: /Arrays & Strings/ });
    expect(topicTile).toHaveClass("rounded-2xl");
    expect(topicTile).not.toHaveClass("lg:col-span-2");
  });

  test("uses the unified raised surface for the problem table", async () => {
    renderProblems();
    await screen.findByText("Challenge 1");
    const tableSurface = screen.getByText("PROBLEM TITLE").closest(".overflow-x-auto");
    expect(tableSurface).toHaveClass("bg-raised");
    expect(tableSurface).not.toHaveClass("bg-slate-950/40");
  });

  test("paginates 15 rows and resets to page one when difficulty changes", async () => {
    renderProblems();
    await screen.findByText("Challenge 1");
    expect(api.get).toHaveBeenCalledWith("/problems/system");
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
    fireEvent.click(screen.getByRole("button", { name: "NEXT" }));
    await screen.findByText("Challenge 16");
    const search = screen.getByRole("textbox", { name: "Search problems" });
    fireEvent.change(search, { target: { value: "15" } });
    expect(await screen.findByText("Challenge 15")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PREV" })).toBeDisabled();
    fireEvent.change(search, { target: { value: "cHaLlEnGe 16" } });
    expect(await screen.findByText("Challenge 16")).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "unmatched title" } });
    expect(await screen.findByText("NO PROBLEMS FOUND MATCHING YOUR CRITERIA.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "NEXT" })).not.toBeInTheDocument();
  });

  test("keeps the solve action navigable after restyling", async () => {
    renderProblems();
    await screen.findByText("Challenge 1");
    fireEvent.click(screen.getAllByRole("button", { name: /SOLVE/ })[0]);
    expect(await screen.findByText("Terminal destination")).toBeInTheDocument();
  });
});
