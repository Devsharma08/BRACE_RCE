import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BracePixelHero } from "./HeroSection";

afterEach(cleanup);

const renderHero = () =>
  render(
    <MemoryRouter>
      <BracePixelHero />
    </MemoryRouter>,
  );

describe("Home hero", () => {
  test("renders the three headline words as one heading", () => {
    renderHero();
    const heading = screen.getByRole("heading", { level: 1 });
    for (const word of ["Compile", "Compete", "Conquer"]) {
      expect(heading).toHaveTextContent(word);
    }
  });

  test("links both CTAs to real in-app routes", () => {
    renderHero();
    const problems = screen.getByRole("link", { name: /enter problems/i });
    expect(problems).toHaveAttribute("href", "/problems");
    const terminal = screen.getByRole("link", { name: /open workspace/i });
    expect(terminal).toHaveAttribute("href", "/terminal");
  });

  test("no longer renders the readout strip", () => {
    renderHero();
    for (const gone of ["ACTIVE", "indexed", "209", "sandboxed", "mode", "focused"]) {
      expect(screen.queryByText(gone)).not.toBeInTheDocument();
    }
  });

  test("fills the screen below the sticky header so it needs no scrolling", () => {
    const { container } = renderHero();
    const inner = container.querySelector("section#top > div.relative.z-10") as HTMLElement;
    expect(inner).not.toBeNull();
    // 100svh minus the 58px header, not a bare 100vh, which pushed the CTAs
    // under the fold on every load.
    expect(inner.className).toContain("min-h-[calc(100svh-58px)]");
    expect(inner.className).not.toMatch(/min-h-screen/);
  });

  test("is a section, not a page: no main and no second nav", () => {
    // A <main> or <nav> here duplicated the app header and forced a viewport
    // height that clipped every section below the hero.
    const { container } = renderHero();
    expect(container.querySelector("main")).toBeNull();
    expect(container.querySelector("nav")).toBeNull();
    // The hero is the first <section> on the page, tagged for in-page anchors.
    expect(container.querySelector('section#top')).not.toBeNull();
  });

  test("does not force a viewport height onto a page section", () => {
    const { container } = renderHero();
    const section = container.querySelector("section");
    expect(section?.className).not.toMatch(/min-h-screen/);
  });

  test("renders the heartbeat behind the headline, not as a separate panel", () => {
    const { container } = renderHero();
    // The standalone waveform card is gone.
    expect(container.querySelector("#signal-gradient")).toBeNull();
    expect(screen.queryByText("rce monitor")).not.toBeInTheDocument();

    // The trace now lives inside the headline wrapper, behind the words.
    const h1 = screen.getByRole("heading", { level: 1 });
    const wrapper = h1.parentElement!;
    const svg = wrapper.querySelector("svg");
    expect(svg).not.toBeNull();
    // On an SVG element `className` is an SVGAnimatedString, so read the
    // attribute instead of the property or the assertions silently no-op.
    const svgClass = svg!.getAttribute("class") ?? "";
    expect(svgClass).toContain("signal-pulse");
    // Behind the text: the svg is absolutely positioned at z-0, the heading at
    // z-10. Reversed, the trace paints over the glyphs.
    expect(svgClass).toContain("absolute");
    expect(svgClass).toContain("z-0");
    expect(h1.className).toContain("relative");
    expect(h1.className).toContain("z-10");
  });

  test("the headline words no longer animate colour; the trace does", () => {
    const { container } = renderHero();
    const h1 = screen.getByRole("heading", { level: 1 });
    // Words carry only the drift + hover treatment, never the colour cycle.
    expect(container.querySelectorAll(".signal-word")).toHaveLength(0);
    for (const word of h1.querySelectorAll("span")) {
      expect(word.className).not.toContain("signal-pulse");
    }
    // The colour cycle class is on the trace.
    expect(container.querySelectorAll(".signal-pulse")).toHaveLength(1);
  });

  test("hides the decorative trace from assistive tech", () => {
    const { container } = renderHero();
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    // Decorative: it must not be focusable or intercept clicks on the CTAs.
    expect(svg.getAttribute("class") ?? "").toContain("pointer-events-none");
  });
});
