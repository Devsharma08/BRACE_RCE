import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
    expect(container.querySelector("section#top")).not.toBeNull();
  });

  test("does not force a viewport height onto a page section", () => {
    const { container } = renderHero();
    const section = container.querySelector("section");
    expect(section?.className).not.toMatch(/min-h-screen/);
  });

  test("draws one continuous trace behind the headline, with no border around it", () => {
    const { container } = renderHero();
    // The standalone waveform panel is gone.
    expect(container.querySelector("#signal-gradient")).toBeNull();
    expect(screen.queryByText("rce monitor")).not.toBeInTheDocument();

    const h1 = screen.getByRole("heading", { level: 1 });
    const wrapper = h1.parentElement!;
    const svg = wrapper.querySelector("svg")!;
    const svgClass = svg.getAttribute("class") ?? "";

    // Behind the type: svg absolute at z-0, heading relative at z-10. Reversed,
    // the line paints over the glyphs.
    expect(svgClass).toContain("absolute");
    expect(svgClass).toContain("z-0");
    expect(h1.className).toContain("relative");
    expect(h1.className).toContain("z-10");

    // Sized to the text band, not overflowing it.
    expect(svgClass).toContain("inset-x-2");
    expect(svgClass).not.toMatch(/h-\[\d+%\]/);

    // One unbroken path, not a row of repeated marks.
    expect(svg.querySelectorAll("path[stroke^='url']")).toHaveLength(1);
    expect(svg.querySelectorAll("use")).toHaveLength(0);

    // No bordered card wrapping the type.
    expect(wrapper.querySelector("div[aria-hidden='true']")).toBeNull();
  });

  test("colour travels across the type as a plain CSS gradient animation", () => {
    renderHero();
    const css = readFileSync("src/index.css", "utf8");
    const h1 = screen.getByRole("heading", { level: 1 });

    // One background-clip:text gradient whose position animates — the simple
    // text colour animation, driven entirely by CSS rather than SVG.
    expect(h1.className).toContain("signal-sweep");
    expect(css).toContain(".signal-sweep");
    expect(css).toContain("background-clip: text");
    expect(css).toContain("@keyframes signalSweep");
    expect(css).toContain("animation: signalSweep");

    // No SVG <animate> driving colour any more.
    expect(document.querySelector("animateTransform")).toBeNull();

    // Words carry no individual colour class — the heading does the work.
    for (const word of h1.querySelectorAll("span")) {
      expect(word.className).not.toContain("signal-sweep");
      expect(word.className).not.toContain("text-accent-");
    }
  });

  test("the headline is larger than it was", () => {
    renderHero();
    const h1 = screen.getByRole("heading", { level: 1 });
    // clamp(2.6rem, 10.5vw, 9.5rem) — up from the previous 2.2/7vw/6.8.
    expect(h1.className).toContain("text-[clamp(2.6rem,10.5vw,9.5rem)]");
  });

  test("hides the decorative trace from assistive tech", () => {
    const { container } = renderHero();
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    // Decorative: it must not be focusable or intercept clicks on the CTAs.
    expect(svg.getAttribute("class") ?? "").toContain("pointer-events-none");
  });
});
