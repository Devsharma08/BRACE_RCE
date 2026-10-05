import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CommunitySupport } from "./CommunitySupport";

afterEach(cleanup);

const renderSection = () =>
  render(
    <div>
      <CommunitySupport />
    </div>,
  );

describe("CommunitySupport sticky signal desk", () => {
  test("renders the signal desk copy", () => {
    renderSection();
    expect(screen.getByText("Signal desk")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /built by/i })).toBeInTheDocument();
    expect(screen.getByText(/direct channel for the people testing/i)).toBeInTheDocument();
    expect(screen.getByText(/channel open/i)).toBeInTheDocument();
    expect(screen.getByText(/routed to the engineering log/i)).toBeInTheDocument();
  });

  test("the aside sticks below the header rather than at the very top", () => {
    // `top-0` tucked the heading behind the 58px sticky app header. A 58px
    // offset would instead leave a dead band once the header auto-hides, so the
    // aside sits just under it.
    const { container } = renderSection();
    const aside = container.querySelector("aside")!;
    expect(aside.className).toContain("lg:sticky");
    expect(aside.className).toContain("lg:top-4");
    expect(aside.className).not.toContain("lg:top-0");
  });

  test("the grid gives sticky room to work within", () => {
    // Sticky needs a scrollable ancestor taller than the item: `items-start`
    // keeps the aside from stretching, and `min-h-screen` supplies the room.
    const { container } = renderSection();
    const grid = container.querySelector("aside")!.parentElement!;
    expect(grid.className).toContain("lg:items-start");
    expect(grid.className).toContain("lg:min-h-screen");
  });
});
