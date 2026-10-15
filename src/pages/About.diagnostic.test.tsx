import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import About from "./About";

describe("About diagnostic", () => {
  it("renders heading", () => {
    const client = new QueryClient();
    const { container } = render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <About />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(container.querySelector("h1")).toBeTruthy();
  });
});