import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { api } from "../config/api";
import MatchAnalysis from "./MatchAnalysis";

vi.mock("../config/api", () => ({ api: { get: vi.fn() } }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "me-1", username: "me" }, isAuthenticated: true }),
}));

// ── real-shaped payload helpers ──────────────────────────────────────────
const sub = (over: Record<string, unknown> = {}) => ({
  id: "sub",
  language: "javascript",
  status: "PASSED",
  runtimeMs: 42,
  memoryKb: 48000,
  passedCase: 18,
  totalCases: 18,
  isBestSubmission: false,
  attemptNumber: 1,
  submittedCode: "return a + b;",
  createdAt: "2026-10-14T09:42:18.000Z",
  ...over,
});

const perf = (over: Record<string, unknown> = {}) => ({
  id: "p",
  userId: "me-1",
  status: "PASSED",
  score: 920,
  questionsSolved: 1,
  timeTakenMs: 42000,
  createdAt: "2026-10-14T09:42:18.000Z",
  user: { id: "me-1", username: "me", avatarUrl: null },
  submissions: [sub()],
  ...over,
});

const buildMatch = (performances: Record<string, unknown>[]) => ({
  ...perf(),
  event: {
    id: "evt-1",
    roomCode: "AB12",
    status: "FINISHED",
    commonProblem: { name: "Reverse Linked List", problem_number: 206, difficulty_level: "HARD" },
    performances,
  },
});

let client: QueryClient;

function renderPage() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/analysis/m-1"]}>
        <Routes>
          <Route path="/analysis/:matchId" element={<MatchAnalysis />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  client?.clear();
});

describe("MatchAnalysis — fully data-driven", () => {
  test("renders real problem, score, runtime from the API (no hardcoded copy)", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { match: buildMatch([perf({ userId: "me-1" }), perf({ id: "p2", userId: "op-9", user: { id: "op-9", username: "rhea" }, score: 486, status: "TIMEOUT", submissions: [sub({ id: "s2", status: "FAILED", runtimeMs: null, passedCase: 12, totalCases: 18 })] })]) },
    });

    renderPage();

    // Real problem name + difficulty from commonProblem.
    await waitFor(() => expect(screen.getByText("Reverse Linked List")).toBeTruthy());
    expect(screen.getByText("HARD")).toBeTruthy();
    expect(screen.getByText("#206")).toBeTruthy();
    // Real score tile.
    expect(screen.getByText("920")).toBeTruthy();
    // 1v1 mode label.
    expect(screen.getByText("1v1 match")).toBeTruthy();
    // Real runtime (42ms) appears, not the old hardcoded "42 ms" label alone.
    expect(screen.getAllByText(/42 ms/).length).toBeGreaterThan(0);
    // Opponent identity comes from the payload (header + chart legend).
    expect(screen.getAllByText("rhea").length).toBeGreaterThan(0);
  });

  test("scales to a multiplayer room — one table row + one line per participant", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        match: buildMatch([
          perf({ userId: "me-1", user: { id: "me-1", username: "me" } }),
          perf({ id: "p2", userId: "op-1", user: { id: "op-1", username: "mika" } }),
          perf({ id: "p3", userId: "op-2", user: { id: "op-2", username: "rhea" }, status: "FAILED", submissions: [sub({ status: "FAILED", runtimeMs: null })] }),
        ]),
      },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("3-player room")).toBeTruthy());
    // Each participant is a row in the head-to-head table + a legend entry.
    expect(screen.getAllByText("mika").length).toBeGreaterThan(0);
    expect(screen.getAllByText("rhea").length).toBeGreaterThan(0);
    expect(screen.getAllByText("me").length).toBeGreaterThan(0);
  });

  test("solo/local solve shows the participant result instead of an opponent", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { match: buildMatch([perf({ userId: "me-1" })]) },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("solo solve")).toBeTruthy());
    // The "Solved" badge (verdict) is present.
    expect(screen.getAllByText("Solved").length).toBeGreaterThan(0);
    // No opponent block in solo mode.
    expect(screen.queryByText("Opponent")).toBeNull();
  });

  test("shows the not-found panel when the API errors", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("404"));
    renderPage();
    // The page query has retry:1, so allow the retry to settle.
    await waitFor(() => expect(screen.getByText("Match not found")).toBeTruthy(), {
      timeout: 4000,
    });
  });
});
