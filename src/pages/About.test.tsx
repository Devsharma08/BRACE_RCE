import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import About from "./About";

const pkg = (p: string) =>
  JSON.parse(readFileSync(resolve(process.cwd(), p), "utf8")) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };

const client = pkg("package.json");
const server = pkg("server/package.json");

const has = (m: typeof client, name: string) =>
  Boolean(m.dependencies[name] ?? m.devDependencies[name]);

/**
 * Every stack entry the page renders must map to a package that is really
 * installed. This is the guard against the About page quietly claiming a
 * technology the project does not use.
 */
const STACK_MAP: { label: string; manifest: "client" | "server"; name: string }[] = [
  { label: "React 19", manifest: "client", name: "react" },
  { label: "Vite", manifest: "client", name: "vite" },
  { label: "Tailwind CSS 4", manifest: "client", name: "tailwindcss" },
  { label: "TanStack Query", manifest: "client", name: "@tanstack/react-query" },
  { label: "Monaco Editor", manifest: "client", name: "@monaco-editor/react" },
  { label: "Socket.IO", manifest: "client", name: "socket.io-client" },
  { label: "Express", manifest: "server", name: "express" },
  { label: "Prisma", manifest: "server", name: "@prisma/client" },
  { label: "PostgreSQL", manifest: "server", name: "pg" },
  { label: "OpenTelemetry", manifest: "server", name: "@opentelemetry/sdk-node" },
];

afterEach(cleanup);

const renderAbout = () => render(<MemoryRouter><About /></MemoryRouter>);

describe("About", () => {
  test("states what the project is in one heading and one paragraph", () => {
    renderAbout();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /multi-language execution/i,
    );
    expect(screen.getByText(/five languages/i)).toBeVisible();
    // Brief by construction: one h1, and no anchor-chip navigation.
    expect(screen.queryByRole("navigation", { name: /about page sections/i })).not.toBeInTheDocument();
  });

  test("lists the measured problem-bank figures", () => {
    renderAbout();
    const facts = within(screen.getByRole("region", { name: "Measured facts" }));
    expect(facts.getByText("Problems")).toBeVisible();
    expect(facts.getByText("194")).toBeVisible();
    expect(facts.getByText(/2,500 stored cases/i)).toBeVisible();
    expect(facts.getByText("893")).toBeVisible();
    expect(facts.getByText("50")).toBeVisible();
  });

  test("explains judging in three steps and reports the batched timings", () => {
    renderAbout();
    const steps = within(screen.getByRole("region", { name: "How execution works" }));
    for (const step of ["Wrap", "Batch", "Judge"]) {
      expect(steps.getByText(step)).toBeVisible();
    }
    expect(steps.getByText(/__CASE__ header/)).toBeVisible();

    const timings = within(screen.getByRole("region", { name: /Measured execution timings/i }));
    expect(timings.getByText("JavaScript")).toBeVisible();
    expect(timings.getByText("51.1s")).toBeVisible();
    expect(timings.getByText("3.9s")).toBeVisible();
  });

  test("only names stack entries that are really installed", () => {
    renderAbout();
    const stack = within(screen.getByRole("region", { name: "Built in the open" }));
    for (const { label, manifest, name } of STACK_MAP) {
      expect(stack.getByText(label)).toBeVisible();
      expect(has(manifest === "client" ? client : server, name)).toBe(true);
    }
    // Piston is an external service, not a dependency — assert it is in neither.
    expect(stack.getByText("Piston")).toBeVisible();
    expect(has(client, "piston")).toBe(false);
    expect(has(server, "piston")).toBe(false);
  });

  test("carries no invented percentages or unverifiable claims", () => {
    renderAbout();
    // The previous revision hardcoded "DB pre-flight 98.4%" and similar figures.
    for (const phrase of ["98.4", "pre-flight", "NOMINAL", "SANDBOXED", "wall clock", "flake rate"]) {
      expect(screen.queryByText(new RegExp(phrase, "i"))).not.toBeInTheDocument();
    }
  });

  test("links to the workspace and the repository", () => {
    renderAbout();
    expect(screen.getByRole("link", { name: /open the workspace/i })).toHaveAttribute(
      "href",
      "/terminal",
    );
    const repo = screen.getByRole("link", { name: /source/i });
    expect(repo).toHaveAttribute("href", "https://github.com/Devsharma08/BRACE_RCE");
    expect(repo).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
  });
});
