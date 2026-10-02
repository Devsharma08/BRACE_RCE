import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  MIN_EDITOR_TRACK_PX,
  outputGridTemplateRows,
  useTerminalLayout,
} from "./useTerminalLayout";

/**
 * The editor/output split is a CSS grid and jsdom has no layout engine, so these
 * tests pin the contract the browser then honours:
 *
 *  - the output row is a capped `minmax(0, N)` track, never a hard `Npx` track
 *    (a hard track cannot shrink, so once the stored height exceeded the space
 *    the grid had, the row spilled out of the grid and took the panel's
 *    scrollbar off-screen — the "output section is no longer scroll-locked"
 *    report), and
 *  - neither a drag nor a resize can leave a stored height the workspace
 *    cannot host.
 */

// The hook batches a pointer frame in rAF; running that callback inline keeps
// the assertions synchronous and independent of jsdom's animation clock. Ticks
// without a callback (jsdom/React teardown paths) are ignored.
const runFramesInline = () =>
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(((callback: FrameRequestCallback) => {
    if (typeof callback === "function") callback(0);
    return 0;
  }) as typeof window.requestAnimationFrame);

const pointerDown = (clientY: number) =>
  ({ button: 0, clientY, preventDefault: vi.fn() }) as unknown as ReactPointerEvent<HTMLDivElement>;

const movePointerTo = (clientY: number) => {
  act(() => {
    window.dispatchEvent(new MouseEvent("pointermove", { clientY }));
  });
};

describe("outputGridTemplateRows — the output track is capped, not hard-sized", () => {
  test("caps the output row so it shrinks instead of escaping the workspace", () => {
    expect(outputGridTemplateRows(320)).toBe(
      `minmax(${MIN_EDITOR_TRACK_PX}px, 1fr) minmax(0, 320px)`,
    );
  });

  test("emits no bare px track, which is what used to overflow the grid", () => {
    const [editorTrack = "", outputTrack = ""] = outputGridTemplateRows(420).match(/minmax\([^)]*\)/g) ?? [];

    // Both rows are shrinkable: the editor keeps a floor, the output is a max.
    expect(editorTrack.startsWith(`minmax(${MIN_EDITOR_TRACK_PX}px`)).toBe(true);
    expect(outputTrack.startsWith("minmax(0,")).toBe(true);
    expect(outputTrack.endsWith("px)")).toBe(true);
  });
});

describe("useTerminalLayout — the output track stays inside the workspace", () => {
  beforeEach(runFramesInline);
  afterEach(() => vi.restoreAllMocks());

  test("stops the track at the ceiling the workspace reports", () => {
    const getMaxOutputHeight = vi.fn(() => 400);
    const { result } = renderHook(() => useTerminalLayout({ getMaxOutputHeight }));
    const initial = result.current.outputHeight;

    act(() => result.current.startOutputDragging(pointerDown(500)));
    movePointerTo(100); // drag the divider up by 400px

    // Unclamped this would be initial + 400 — the container caps it instead.
    expect(result.current.outputHeight).toBe(400);
    expect(initial + 400).toBeGreaterThan(400);
    expect(getMaxOutputHeight).toHaveBeenCalled();
  });

  test("falls back to the viewport ceiling while the workspace cannot be measured", () => {
    const viewportCeiling = Math.max(150, window.innerHeight - 200);
    const { result } = renderHook(() => useTerminalLayout({ getMaxOutputHeight: () => 0 }));

    act(() => result.current.startOutputDragging(pointerDown(500)));
    movePointerTo(100);

    // The hard 120px floor would be the wrong answer here: an unmeasured
    // container means "no information", not "the workspace is tiny".
    expect(result.current.outputHeight).toBe(viewportCeiling);
  });

  test("keeps a minimum track when the divider is dragged down", () => {
    const { result } = renderHook(() => useTerminalLayout());

    act(() => result.current.startOutputDragging(pointerDown(100)));
    movePointerTo(900);

    expect(result.current.outputHeight).toBe(80);
  });

  test("snaps back under the real ceiling when the workspace shrank mid-drag", () => {
    let ceiling = 600;
    const { result } = renderHook(() => useTerminalLayout({ getMaxOutputHeight: () => ceiling }));

    act(() => result.current.startOutputDragging(pointerDown(800)));
    movePointerTo(0);
    expect(result.current.outputHeight).toBeGreaterThan(300);

    ceiling = 300; // the container shrank before the pointer came up
    act(() => {
      window.dispatchEvent(new MouseEvent("pointerup"));
    });

    // Release re-clamps, so a stale height can never be carried into the next
    // render — that stale value is what "loosened" the output section.
    expect(result.current.outputHeight).toBe(300);
  });

  test("re-clamps the stored height when the window resizes", () => {
    let ceiling = 500;
    const { result } = renderHook(() => useTerminalLayout({ getMaxOutputHeight: () => ceiling }));

    act(() => result.current.startOutputDragging(pointerDown(800)));
    movePointerTo(0);
    expect(result.current.outputHeight).toBe(500);

    ceiling = 240;
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current.outputHeight).toBe(240);
  });
});
