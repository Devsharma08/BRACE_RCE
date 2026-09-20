import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickNavHub } from "./QuickNavHub";

afterEach(cleanup);

describe("QuickNavHub", () => {
  const defaultProps = {
    onFindMatch: vi.fn(),
    matchmakingStatus: "IDLE" as const,
    onCancelMatch: vi.fn(),
    onCreateCustomRoom: vi.fn(),
    onJoinCustomRoom: vi.fn(),
    waitingTime: 0,
  };

  test("renders the battle arena panel with queue title and online status", () => {
    render(<QuickNavHub {...defaultProps} />);
    expect(screen.getByText("PVP BATTLE ARENA")).toBeInTheDocument();
    expect(screen.getByText("SYSTEM ONLINE")).toBeInTheDocument();
    expect(screen.getByText("1V1 MATCHMAKING QUEUE")).toBeInTheDocument();
  });

  test("renders all four difficulty selector buttons", () => {
    render(<QuickNavHub {...defaultProps} />);
    const buttons = screen.getAllByRole("button", {
      name: /ANY|EASY|MEDIUM|HARD/i,
    });
    expect(buttons.length).toBe(4);
  });

  test("calls onFindMatch with selected difficulty when enter button is clicked", async () => {
    const onFindMatch = vi.fn();
    render(<QuickNavHub {...defaultProps} onFindMatch={onFindMatch} />);

    const user = userEvent.setup();
    const easyButton = screen.getByRole("button", { name: "EASY" });
    await user.click(easyButton);

    const enterButton = screen.getByRole("button", {
      name: /enter 1v1 matchmaking battle/i,
    });
    await user.click(enterButton);

    expect(onFindMatch).toHaveBeenCalledWith("EASY");
  });

  test("shows IN QUEUE badge and cancel button when matchmakingStatus is SEARCHING", () => {
    render(
      <QuickNavHub
        {...defaultProps}
        matchmakingStatus="SEARCHING"
        waitingTime={12}
      />,
    );
    expect(screen.getByText(/IN QUEUE \(12s\)/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel matchmaking queue/i }),
    ).toBeInTheDocument();
  });
});
