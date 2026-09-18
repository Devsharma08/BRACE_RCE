import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { CircleSlash } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { ConnectionIndicator } from "./ConnectionIndicator";
import { MetricCard } from "./MetricCard";
import { PageHeader } from "./PageHeader";
import { Panel, PanelBody, PanelHeader } from "./Panel";
import { EmptyState } from "./EmptyState";

afterEach(cleanup);

describe("Shared UI primitives", () => {
  test("StatusPill renders its label with a decorative dot", () => {
    render(<StatusPill tone="live" pulse>TEST SUITE // NOMINAL</StatusPill>);
    expect(screen.getByText("TEST SUITE // NOMINAL")).toBeVisible();
    // The pill itself is decorative — it should not claim status semantics.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("ConnectionIndicator exposes connection state via role=status", () => {
    render(<ConnectionIndicator state="online" name="Socket" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAccessibleName(/socket: online/i);
    expect(within(status).getByText(/ONLINE/)).toBeVisible();
  });

  test("MetricCard shows label, value, unit, trend and description", () => {
    render(
      <MetricCard
        label="Current rating"
        value={1842}
        unit="elo"
        trend="+12 this week"
        description="Across ranked battles."
        dotTone="active"
      />,
    );
    expect(screen.getByText("Current rating")).toBeVisible();
    expect(screen.getByText("1842")).toBeVisible();
    expect(screen.getByText("elo")).toBeVisible();
    expect(screen.getByText("+12 this week")).toBeVisible();
    expect(screen.getByText("Across ranked battles.")).toBeVisible();
  });

  test("PageHeader renders eyebrow, heading, description and actions", () => {
    render(
      <PageHeader
        as="h1"
        eyebrow="Command center"
        title="Operative dashboard"
        description="Your training at a glance."
        actions={<button>Continue training</button>}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: /operative dashboard/i })).toBeVisible();
    expect(screen.getByText("Command center")).toBeVisible();
    expect(screen.getByText("Your training at a glance.")).toBeVisible();
    expect(screen.getByRole("button", { name: /continue training/i })).toBeVisible();
  });

  test("Panel composes header, body and aria labelling", () => {
    render(
      <Panel ariaLabel="Recent executions">
        <PanelHeader title="Recent executions" actions={<span>5 rows</span>} />
        <PanelBody>Row content</PanelBody>
      </Panel>,
    );
    const panel = screen.getByRole("region", { name: "Recent executions" });
    expect(within(panel).getByText("Recent executions")).toBeVisible();
    expect(within(panel).getByText("Row content")).toBeVisible();
  });

  test("EmptyState renders icon, message and action", () => {
    render(
      <EmptyState
        icon={CircleSlash}
        title="No submissions yet"
        message="Run your first problem to see results here."
        action={<button>Open terminal</button>}
      />,
    );
    expect(screen.getByText("No submissions yet")).toBeVisible();
    expect(screen.getByText(/Run your first problem/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /open terminal/i })).toBeVisible();
  });
});