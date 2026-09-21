import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AlgorithmLibrary } from "./AlgorithmLibrary";
import { DS_ALGORITHMS } from "../../data/dsAlgorithms";

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

afterEach(cleanup);

describe("AlgorithmLibrary", () => {
  test("renders every algorithm as a flat bash card with all content visible", () => {
    render(<AlgorithmLibrary slug="array" />);
    expect(screen.getByText("SYS // ALGORITHM_LIBRARY")).toBeInTheDocument();
    expect(screen.getAllByText(/Two Pointers/)).toHaveLength(2);
    expect(screen.getAllByText(/pair_sum/)).toHaveLength(1);
    expect(screen.getByText(/^Kadane/)).toBeInTheDocument();
    // Questions block removed from the cards — data stays in the module only.
    expect(screen.queryByText("// PRACTICE_QUESTIONS")).not.toBeInTheDocument();
    // No accordion: pseudocode is visible without any click.
    expect(screen.getAllByLabelText(/Copy pseudocode/)).toHaveLength(3);
  });

  test("per-card language select swaps the implementation in place", () => {
    render(<AlgorithmLibrary slug="array" />);
    const selects = screen.getAllByLabelText(/implementation language/i);
    expect(selects).toHaveLength(3);
    fireEvent.change(selects[0], { target: { value: "cpp" } });
    expect(screen.getByText(/pairSum/)).toBeInTheDocument();
  });

  test("copy button writes the implementation to the clipboard", async () => {
    render(<AlgorithmLibrary slug="array" />);
    fireEvent.click(
      screen.getAllByLabelText("Copy implementation to clipboard")[0],
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("def pair_sum"),
    );
    expect((await screen.findAllByText("COPIED")).length).toBeGreaterThan(0);
  });

  test("renders nothing for an unknown slug", () => {
    const { container } = render(<AlgorithmLibrary slug="not-a-topic" />);
    expect(container).toBeEmptyDOMElement();
  });

  test("covers every registered topic with 3 algorithms, 3 languages and question refs", () => {
    const topics = Object.values(DS_ALGORITHMS);
    expect(topics.length).toBeGreaterThanOrEqual(8);
    for (const topic of topics) {
      expect(topic.slugs.length).toBeGreaterThan(0);
      expect(topic.algorithms).toHaveLength(3);
      for (const alg of topic.algorithms) {
        expect(Object.keys(alg.implementations).sort()).toEqual([
          "cpp",
          "javascript",
          "python",
        ]);
        expect(Object.keys(alg.pseudocode).sort()).toEqual([
          "cpp",
          "javascript",
          "python",
        ]);
        expect(alg.questions.length).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
