import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { api } from "../config/api";
import { Problems } from "./Problems";

vi.mock("../config/api", () => ({ api: { get: vi.fn() } }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: { username: "TEST" } }) }));
vi.mock("../hooks/useLeaderboard", () => ({ useMyRating: () => ({ data: { rating: 1200 } }) }));
vi.mock("../components/layout/DashboardSidebar", () => ({ default: () => null }));
vi.mock("../components/layout/MobileBottomNav", () => ({ default: () => null }));

vi.mock("../hooks/useSocketInvalidation", () => ({
  useSocketInvalidation: () => undefined,
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
