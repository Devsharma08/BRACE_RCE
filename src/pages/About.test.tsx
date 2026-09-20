import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import About from "./About";

const clientPackage = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};
const serverPackage = JSON.parse(readFileSync(resolve(process.cwd(), "server/package.json"), "utf8")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

const clientDependencies = ["@monaco-editor/react", "@tanstack/react-query", "socket.io-client", "@react-oauth/google", "@marsidev/react-turnstile"];
const serverDependencies = ["express", "@prisma/client", "pg", "jsonwebtoken", "bcrypt", "express-rate-limit"];
const foundationDependencies = ["react", "vite", "typescript", "tailwindcss"];
const candidateDependencies = ["playwright", "axe-core"];

afterEach(cleanup);

function renderAbout() {
  return render(<MemoryRouter><About /></MemoryRouter>);
}

describe("About", () => {
  test("hero presents the mission with anchor hooks into every core component", () => {
    renderAbout();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Build your skills.");
    expect(screen.getByText(/my DSA journey meets my web development skills/)).toBeVisible();
    const anchors = within(screen.getByRole("navigation", { name: "About page sections" }));
    for (const label of ["02 // Technical innovation", "03 // System telemetry", "04 // Tech stack matrix", "05 // Operative credit"]) {
      expect(anchors.getByRole("link", { name: label })).toHaveAttribute("href", expect.stringMatching(/^#/));
    }
  });

  test("technical innovation describes the polyglot engine and sandboxed execution", () => {
    renderAbout();
    const innovation = within(screen.getByRole("region", { name: "Engineered for polyglot execution" }));
    expect(innovation.getByText("Polyglot Engine")).toBeVisible();
    expect(innovation.getByText("Sandboxed Execution")).toBeVisible();
    expect(innovation.getByText("Test Suite Orchestration")).toBeVisible();
    expect(innovation.getByText("Raw solution → automated wrapper payload")).toBeVisible();
    expect(innovation.getByText(/wrapper generator \/\/ automated transform/)).toBeVisible();
  });

  test("telemetry shows a live test-suite status with pre-flight DB verification", () => {
    renderAbout();
    const telemetry = within(screen.getByRole("region", { name: /Interactive System Telemetry/ }));
    const status = telemetry.getByRole("status");
    expect(status).toHaveAccessibleName(/Test suite status/i);
    expect(within(status).getByText(/DB pre-flight 98\.4%/)).toBeVisible();
    expect(telemetry.getByText("DB pre-flight")).toBeVisible();
  });

  test("tech stack matrix lists real dependencies with motivation and honest candidates", () => {
    renderAbout();
    const foundation = within(screen.getByRole("region", { name: "Built in the open" }));
    for (const name of clientDependencies) {
      expect(foundation.getByText(name)).toBeVisible();
      expect(clientPackage.dependencies[name]).toBeTruthy();
      expect(serverPackage.dependencies[name]).toBeUndefined();
    }
    for (const name of serverDependencies) {
      expect(foundation.getByText(name)).toBeVisible();
      expect(serverPackage.dependencies[name]).toBeTruthy();
      expect(clientPackage.dependencies[name]).toBeUndefined();
    }
    for (const name of foundationDependencies) {
      expect(foundation.getByText(name)).toBeVisible();
      expect(clientPackage.dependencies[name] ?? clientPackage.devDependencies[name]).toBeTruthy();
    }
    for (const name of candidateDependencies) {
      expect(foundation.getByText(name)).toBeVisible();
      expect(clientPackage.dependencies[name] ?? clientPackage.devDependencies[name]).toBeUndefined();
      expect(serverPackage.dependencies[name] ?? serverPackage.devDependencies[name]).toBeUndefined();
    }
    expect(foundation.getByText("Candidate — not installed")).toBeVisible();
    expect(foundation.getByText(/Playwright would turn the outstanding browser-level responsive review/)).toBeVisible();
    expect(foundation.getByText(/axe-core would bring automated accessibility assertions/)).toBeVisible();
  });

  test("operative credit names the developer and points contributors to the current repository", () => {
    renderAbout();
    expect(screen.getByText("Dev Sharma")).toBeVisible();
    expect(screen.getByText("@DEV_SHARMA")).toBeVisible();
    expect(screen.queryByRole("navigation", { name: /workspace/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Choose your workspace")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Explore the repository/ })).toHaveAttribute("href", "https://github.com/Devsharma08/BRACE_RCE");
    expect(screen.getByRole("link", { name: /Source repository/ })).toHaveAttribute("href", "https://github.com/Devsharma08/BRACE_RCE");
    expect(screen.getByRole("link", { name: /Browse project issues/ })).toHaveAttribute("href", "https://github.com/Devsharma08/BRACE_RCE/issues");
    expect(screen.getByRole("link", { name: /DSA data repository/ })).toHaveAttribute("href", "https://github.com/Devsharma08/DSA-LEETCODE");
    for (const link of screen.getAllByRole("link").filter(link => link.getAttribute("target") === "_blank")) {
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
