import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useState, useEffect } from "react";

// Step tests: add one module at a time and see which breaks hooks.
function StepA() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((c) => c + 1), 100);
    return () => clearInterval(id);
  }, []);
  return <div>n={n}</div>;
}

function StepB() {
  return <a href="/x">link</a>;
}

function StepC() {
  return <code data-testid="c">x</code>;
}

function StepD() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setV((c) => c + 1), 100);
    return () => clearTimeout(id);
  }, []);
  return <div data-testid="d">{v}</div>;
}

describe("module hook diagnostic", () => {
  it("StepA renders useState + useEffect", () => {
    const { container } = render(<MemoryRouter><StepA /></MemoryRouter>);
    expect(container.textContent).toContain("n=");
  });

  it("StepB renders a react-router <Link>", () => {
    const { container } = render(<MemoryRouter><StepB /></MemoryRouter>);
    expect(container.querySelector("a")).toBeTruthy();
  });

  it("StepC renders a lucide <code>", () => {
    const { container } = render(<MemoryRouter><StepC /></MemoryRouter>);
    expect(container.querySelector("[data-testid=c]")).toBeTruthy();
  });

  it("StepD renders useState + useEffect with react-router + lucide deps", () => {
    const { container } = render(<MemoryRouter><StepD /></MemoryRouter>);
    expect(container.textContent).toContain("d=");
  });
});
