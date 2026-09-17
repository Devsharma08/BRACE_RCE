import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HeroSection from "./HeroSection";
import LaunchRail from "./LaunchRail";
import BentoGrid from "./BentoGrid";
import { bentoItems } from "../content";

beforeEach(() => {
  vi.useFakeTimers();
  window.sessionStorage.clear();
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Home launch and category routes", () => {
  test("links each launch destination to its existing route", () => {
    render(<MemoryRouter><LaunchRail /></MemoryRouter>);
    const rail = within(screen.getByRole("navigation", { name: "Home launch rail" }));
    expect(rail.getAllByRole("link")).toHaveLength(3);
    expect(rail.getByRole("link", { name: /Launch terminal/ })).toHaveAttribute("href", "/terminal");
    expect(rail.getByRole("link", { name: /Practice problems/ })).toHaveAttribute("href", "/problems");
    expect(rail.getByRole("link", { name: /Battle arena/ })).toHaveAttribute("href", "/lobby");
  });

  test("renders every category exactly once without ticker duplicates", () => {
    render(<MemoryRouter><BentoGrid /></MemoryRouter>);
    const categories = within(screen.getByRole("region", { name: "Master Every Structure" }));
    const links = categories.getAllByRole("link");
    expect(links).toHaveLength(bentoItems.length);
    bentoItems.forEach((item, index) => {
      expect(links[index]).toHaveAttribute("href", `/ds/${item.slug}`);
      expect(links[index]).toHaveTextContent(item.title);
      expect(links[index]).toHaveTextContent(item.desc);
    });
  });
});

describe("Home hero preservation", () => {
  test("keeps the complete matrix, first-visit boot and existing CTAs", () => {
    const { container } = render(<MemoryRouter><HeroSection /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("BRACE RCE");
    expect(container.querySelectorAll(".pixel-row")).toHaveLength(15);
    expect(container.querySelectorAll(".pixel-cell")).toHaveLength(1500);
    expect(container.querySelector('[style*="bootPixel"]')).not.toBeNull();
    expect(window.sessionStorage.getItem("brace_rce_boot::hero-boot")).toBe("1");
    expect(screen.getByRole("link", { name: /LAUNCH TERMINAL/ })).toHaveAttribute("href", "/terminal");
    expect(screen.getByRole("link", { name: /1V1 BATTLE ARENA/ })).toHaveAttribute("href", "/lobby");
  });

  test("shows an already-booted matrix without replaying the boot", () => {
    window.sessionStorage.setItem("brace_rce_boot::hero-boot", "1");
    const { container } = render(<MemoryRouter><HeroSection /></MemoryRouter>);
    expect(container.querySelector('[style*="bootPixel"]')).toBeNull();
    expect(screen.queryByText(/INITIALIZING RCE CORE/)).not.toBeInTheDocument();
    expect(screen.getByText("RCE CORE // ONLINE")).toBeVisible();
    const activePixel = container.querySelector<HTMLElement>('.pixel-cell[style]');
    expect(activePixel?.style.opacity).toBe("1");
  });
});
