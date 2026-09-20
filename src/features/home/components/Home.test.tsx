import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WorkspaceDirectory } from "./WorkspaceDirectory";
import { CategoryDirectory } from "./CategoryDirectory";
import { services } from "./WorkspaceDirectory";

afterEach(cleanup);

describe("WorkspaceDirectory", () => {
  test("renders five protocol cards linking to live routes", () => {
    render(
      <MemoryRouter>
        <WorkspaceDirectory />
      </MemoryRouter>,
    );
    const section = screen.getByRole("region", { name: "Available workspaces" });
    const links = within(section).getAllByRole("link");
    expect(links).toHaveLength(services.length);

    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/problems");
    expect(hrefs).toContain("/terminal");
    expect(hrefs).toContain("/lobby");
    expect(hrefs).toContain("/friends");
    expect(hrefs).toContain("/dashboard");
  });

  test("keeps the accent vocabulary on the brand and success tokens", () => {
    render(
      <MemoryRouter>
        <WorkspaceDirectory />
      </MemoryRouter>,
    );
    const section = screen.getByRole("region", { name: "Available workspaces" });
    expect(within(section).getByText(/Choose your/)).toBeInTheDocument();
    expect(within(section).getByText("WORKSPACE READY")).toBeInTheDocument();
    expect(within(section).getByText("LOBBY ACTIVE")).toBeInTheDocument();
  });
});

describe("CategoryDirectory", () => {
  test("renders eight category rows linking to /problems", () => {
    render(
      <MemoryRouter>
        <CategoryDirectory />
      </MemoryRouter>,
    );
    const section = screen.getByRole("region", { name: "Problem categories" });
    const links = within(section).getAllByRole("link");
    expect(links).toHaveLength(8);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/problems"));
  });
});
