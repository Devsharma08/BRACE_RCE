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

  test("hides the decorative waveform from assistive tech", () => {
    const { container } = renderHero();
    const monitor = container.querySelector('[aria-hidden="true"].relative.mx-auto');
    expect(monitor).not.toBeNull();
    expect(within(monitor as HTMLElement).queryByRole("img")).toBeNull();
  });
});
