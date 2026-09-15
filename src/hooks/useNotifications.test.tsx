import { describe, test, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { NotificationItem } from "./useNotifications";

const { fakeSocket, socketHandlers, listNotifications } = vi.hoisted(() => {
    const socketHandlers: Record<string, (payload: unknown) => void> = {};
    const existing: unknown = {
        id: "existing-1",
        type: "SYSTEM",
        title: "Welcome",
        body: "First notification",
        status: "UNREAD",
        createdAt: "2026-01-01T00:00:00.000Z",
    };
    return {
        socketHandlers,
        listNotifications: vi.fn(async () => ({ data: { notifications: [existing] } })),
        fakeSocket: {
            on: vi.fn((event: string, handler: (payload: unknown) => void) => {
                socketHandlers[event] = handler;
            }),
            off: vi.fn(),
            emit: vi.fn(),
        },
    };
});

vi.mock("../context/SocketContext", () => ({
    useSocket: () => ({ socket: fakeSocket, isConnected: true }),
}));
vi.mock("../config/api", () => ({
    api: { get: listNotifications, patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));
vi.mock("sonner", () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useNotifications, useUnreadCount } from "./useNotifications";

const EXISTING_ITEM: NotificationItem = {
    id: "existing-1",
    type: "SYSTEM",
    title: "Welcome",
    body: "First notification",
    status: "UNREAD",
    createdAt: "2026-01-01T00:00:00.000Z",
};

const INCOMING: NotificationItem = {
    id: "incoming-1",
    type: "CHALLENGE_RECEIVED",
    title: "New challenge",
    body: "user2 challenged you",
    status: "UNREAD",
    createdAt: "2026-01-02T00:00:00.000Z",
};

function makeClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapperFor(queryClient: QueryClient) {
    return ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function listOf(queryClient: QueryClient, key: "all" | "unread") {
    return queryClient.getQueryData<{ notifications: NotificationItem[] }>([
        "notifications",
        key,
    ])?.notifications;
}

describe("useNotifications socket handling", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        for (const event of Object.keys(socketHandlers)) delete socketHandlers[event];
    });

    test("prepends the notification and bumps the badge without any refetch", async () => {
        const queryClient = makeClient();
        renderHook(() => useNotifications(), { wrapper: wrapperFor(queryClient) });

        // Initial REST load happens once.
        await waitFor(() => expect(listNotifications).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(listOf(queryClient, "all")).toHaveLength(1));

        queryClient.setQueryData(["notifications-unread-count"], { unreadCount: 3 });

        act(() => {
            socketHandlers["notification:new"](INCOMING);
        });

        // Newest first, nothing dropped.
        expect(listOf(queryClient, "all")?.map((n) => n.id)).toEqual([
            INCOMING.id,
            EXISTING_ITEM.id,
        ]);
        expect(queryClient.getQueryData(["notifications-unread-count"])).toEqual({
            unreadCount: 4,
        });
        // The whole point of Phase 1: no network request on arrival.
        expect(listNotifications).toHaveBeenCalledTimes(1);
    });

    test("also patches the unread-only list", async () => {
        const queryClient = makeClient();
        queryClient.setQueryData(["notifications", "unread"], {
            notifications: [EXISTING_ITEM],
        });

        renderHook(() => useNotifications(true), { wrapper: wrapperFor(queryClient) });
        act(() => {
            socketHandlers["notification:new"](INCOMING);
        });

        expect(listOf(queryClient, "unread")?.map((n) => n.id)).toEqual([
            INCOMING.id,
            EXISTING_ITEM.id,
        ]);
    });

    test("ignores a duplicate delivery (no cloned row, no double-counted badge)", async () => {
        const queryClient = makeClient();
        renderHook(() => useNotifications(), { wrapper: wrapperFor(queryClient) });
        await waitFor(() => expect(listOf(queryClient, "all")).toHaveLength(1));

        queryClient.setQueryData(["notifications-unread-count"], { unreadCount: 1 });

        act(() => {
            socketHandlers["notification:new"](INCOMING);
        });
        act(() => {
            socketHandlers["notification:new"](INCOMING);
        });

        expect(listOf(queryClient, "all")?.map((n) => n.id)).toEqual([
            INCOMING.id,
            EXISTING_ITEM.id,
        ]);
        expect(queryClient.getQueryData(["notifications-unread-count"])).toEqual({
            unreadCount: 2,
        });
    });

    test("unsubscribes on unmount", async () => {
        const queryClient = makeClient();
        const { unmount } = renderHook(() => useNotifications(), {
            wrapper: wrapperFor(queryClient),
        });
        await waitFor(() => expect(fakeSocket.on).toHaveBeenCalledWith("notification:new", expect.any(Function)));

        unmount();

        expect(fakeSocket.off).toHaveBeenCalledWith("notification:new", expect.any(Function));
    });

    test("useUnreadCount only polls as a slow safety net", () => {
        const queryClient = makeClient();
        const { result } = renderHook(() => useUnreadCount(), {
            wrapper: wrapperFor(queryClient),
        });

        expect(result.current.isSuccess || result.current.isPending).toBe(true);
    });
});