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

  test("the headline text is static, with a unique gradient per word", () => {
    renderHero();
    const css = readFileSync("src/index.css", "utf8");
    const h1 = screen.getByRole("heading", { level: 1 });

    // Shared plumbing on every word: background-clip:text is present and applied.
    expect(css).toContain(".signal-word {");
    expect(css).toContain("background-clip: text");

    // Each word carries its own tone class, and all three are distinct.
    const wordSpans = Array.from(h1.querySelectorAll("span.signal-word"));
    expect(wordSpans).toHaveLength(3);
    const tones = wordSpans.map((span) =>
      ["signal-word--compile", "signal-word--compete", "signal-word--conquer"].find(
        (tone) => span.className.includes(tone),
      ),
    );
    expect(new Set(tones).size).toBe(3);
    expect(tones.filter(Boolean)).toHaveLength(3);

    // Three different gradient STYLES, not one shared linear sweep.
    const rules = tones.map((tone) => {
      const start = css.indexOf(`.${tone} {`);
      expect(start).toBeGreaterThan(-1);
      const rule = css.slice(start, css.indexOf("}", start));
      expect(rule).toContain("background-image");
      return rule;
    });
    expect(rules[0]).toContain("linear-gradient");
    expect(rules[1]).toContain("linear-gradient");
    expect(rules[2]).toContain("radial-gradient");
    expect(new Set(rules).size).toBe(3);

    // The words must NOT animate. An animated, oversized, no-repeat gradient
    // slides off the glyphs and leaves transparent text with nothing behind
    // it — the words vanish mid-cycle. background-size must cover the box and
    // there must be no animation on the base class.
    expect(css).toContain("background-size: 100% 100%");
    expect(css).not.toContain("@keyframes signalSweep");
    const baseRule = css.slice(css.indexOf(".signal-word {"));
    expect(baseRule.slice(0, baseRule.indexOf("}"))).not.toContain("animation");
    expect(h1.className).not.toContain("animate");

    // Gradient spans every word, so each one is coloured.
    for (const word of ["Compile", "Compete", "Conquer"]) {
      expect(h1).toHaveTextContent(word);
    }
  });

  test("has no hover animation on the headline words", () => {
    renderHero();
    const h1 = screen.getByRole("heading", { level: 1 });
    for (const span of h1.querySelectorAll("span.signal-word")) {
      expect(span.className).not.toMatch(/hover:|transition|duration-/);
    }
  });

  test("positions signal, structure and runtime as three separate side markers", () => {
    renderHero();
    // Three distinct markers, not one combined string.
    const markers: Array<[string, RegExp]> = [
      ["signal", /right-5/],
      ["structure", /left-5/],
      ["runtime", /right-5/],
    ];
    for (const [label, edge] of markers) {
      const el = screen.getByText(label, { exact: true });
      const cls = el.className;
      expect(cls).toContain("absolute");
      expect(cls).toMatch(edge);
      // Large screens only: below lg there is no gutter to sit in.
      expect(cls).toContain("hidden");
      expect(cls).toContain("lg:block");
      // Decorative: must not capture pointer events over the CTAs.
      expect(cls).toContain("pointer-events-none");
    }
    // The old combined string is gone.
    expect(screen.queryByText(/signal \/ structure \/ runtime/)).toBeNull();
    // Vertically stacked: signal upper, structure centred, runtime lower.
    const structure = screen.getByText("structure", { exact: true });
    expect(structure.className).toContain("top-1/2");
    expect(structure.className).toContain("-translate-y-1/2");
  });

  test("only the background svg carries the colour animation", () => {
    const { container } = renderHero();
    const h1 = screen.getByRole("heading", { level: 1 });
    const svg = h1.parentElement!.querySelector("svg")!;

    // The motion lives on the trace: its gradient slides left -> right, so
    // colour travels along the line instead of the whole stroke changing at
    // once. No <animate> anywhere on the text.
    const animate = svg.querySelector("animateTransform");
    expect(animate).not.toBeNull();
    expect(animate!.getAttribute("attributeName")).toBe("gradientTransform");
    expect(animate!.getAttribute("values")).toContain("-1 0");
    expect(animate!.getAttribute("values")).toContain("1 0");
    expect(h1.querySelector("animateTransform")).toBeNull();
    expect(container.querySelector("animate")).toBeNull();

    // The trace itself drifts, which is the only CSS animation in the hero.
    expect(svg.getAttribute("class")).toContain("signal-drift");
  });

  test("the headline font is a moderate size, smaller than the 9.5rem peak", () => {
    renderHero();
    const h1 = screen.getByRole("heading", { level: 1 });
    // clamp(1.9rem, 6.2vw, 5.4rem) — down from clamp(2.6rem,10.5vw,9.5rem).
    expect(h1.className).toContain("text-[clamp(1.9rem,6.2vw,5.4rem)]");
    expect(h1.className).not.toContain("9.5rem");
  });

  test("hides the decorative trace from assistive tech", () => {
    const { container } = renderHero();
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    // Decorative: it must not be focusable or intercept clicks on the CTAs.
    expect(svg.getAttribute("class") ?? "").toContain("pointer-events-none");
  });
});

describe("Home hero reduced motion", () => {
  const stubMatchMedia = (value: boolean) => {
    const listeners = new Set<() => void>();
    // A minimal MediaQueryList stand-in: only `matches` and the listener API
    // are used by useMediaQuery. A duplicate key here would silently shadow
    // the real method.
    const mql = {
      matches: value,
      media: "",
      onchange: null,
      addEventListener: (_type: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_type: string, cb: () => void) => listeners.delete(cb),
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: () => mql,
    });
  };

  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
  });

  test("removes the svg's colour animation from the DOM", () => {
    // CSS cannot stop an SVG <animateTransform>, so the element has to be
    // absent — not merely restyled.
    stubMatchMedia(true);
    const { container } = renderHero();
    expect(container.querySelector("animateTransform")).toBeNull();
    expect(container.querySelector("svg")!.getAttribute("class")).toContain(
      "signal-trace-static",
    );
  });

  test("keeps the animation when motion is allowed", () => {
    stubMatchMedia(false);
    const { container } = renderHero();
    expect(container.querySelector("animateTransform")).not.toBeNull();
    expect(container.querySelector("svg")!.getAttribute("class")).not.toContain(
      "signal-trace-static",
    );
  });

  test("the headline stays a static gradient either way", () => {
    // The text has no animation to disable, so it is identical in both modes.
    stubMatchMedia(true);
    const { container } = renderHero();
    const h1 = container.querySelector("h1")!;
    expect(h1.querySelectorAll("span.signal-word")).toHaveLength(3);
    expect(h1.querySelector("animateTransform")).toBeNull();
  });
});
