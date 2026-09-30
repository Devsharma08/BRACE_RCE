import { describe, test, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { apiGet, apiPost, apiDelete, markReadMock, markAllMock } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  markReadMock: vi.fn(),
  markAllMock: vi.fn(),
}));

vi.mock("../../config/api", () => ({
  api: { get: apiGet, post: apiPost, delete: apiDelete, patch: vi.fn() },
}));

vi.mock("../../hooks/useNotifications", () => ({
  useNotifications: () => ({
    data: {
      notifications: [
        {
          id: "notif-1",
          type: "FRIEND_REQUEST",
          title: "New friend request",
          body: "tank sent you a friend request.",
          status: "UNREAD",
          createdAt: new Date().toISOString(),
          data: { senderName: "tank", requestId: "req-1", senderId: "sender-9" },
        },
      ],
    },
    isLoading: false,
  }),
  useUnreadCount: () => ({ data: { unreadCount: 150 } }),
  useMarkRead: () => ({ mutate: markReadMock }),
  useMarkAllRead: () => ({ mutate: markAllMock }),
}));

vi.mock("../../hooks/useSocketInvalidation", () => ({
  useSocketInvalidation: () => undefined,
}));

vi.mock("../../context/SocketContext", () => ({
  useSocket: () => ({ socket: null, isConnected: false }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { NotificationCenter } from "./NotificationCenter";

const renderPanel = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationCenter />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  apiPost.mockResolvedValue({ data: {} });
  apiDelete.mockResolvedValue({ data: {} });
});

describe("NotificationCenter — badge", () => {
  test("caps large unread counts at 99+ instead of 9+", () => {
    renderPanel();
    expect(screen.getByText("99+")).toBeInTheDocument();
  });
});

describe("NotificationCenter — friend-request actions", () => {
  const openQueue = async () => {
    fireEvent.click(screen.getByTitle("Notifications"));
    return screen.findByTitle("Accept friend request");
  };

  test("FRIEND_REQUEST rows expose Accept and Reject", async () => {
    renderPanel();

    await openQueue();

    expect(screen.getByTitle("Accept friend request")).toBeInTheDocument();
    expect(screen.getByTitle("Reject friend request")).toBeInTheDocument();
  });

  test("accept posts the embedded request/sender ids and clears the row", async () => {
    renderPanel();
    await openQueue();

    fireEvent.click(screen.getByTitle("Accept friend request"));

    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith("/friends/accept", {
        requestId: "req-1",
        senderId: "sender-9",
      }),
    );
    // Row is no longer actionable → notification deleted too.
    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith("/notifications/notif-1"));
  });

  test("reject posts the request id", async () => {
    renderPanel();
    await openQueue();

    fireEvent.click(screen.getByTitle("Reject friend request"));

    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith("/friends/reject", { requestId: "req-1" }),
    );
  });
});
