import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useState, useEffect } from "react";

function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => c + 1), 100);
    return () => clearInterval(id);
  }, []);
  return <div>count={count}</div>;
}

describe("hook diagnostic", () => {
  it("renders a useState + useEffect component", () => {
    render(
      <MemoryRouter>
        <Counter />
      </MemoryRouter>,
    );
    expect(screen.getByText("count=0")).toBeTruthy();
  });
});
