import { useEffect } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../context/SocketContext";

/**
 * Invalidate TanStack Query caches when the server signals that data changed.
 *
 * The server is the single source of truth for what is stale: it emits a small
 * invalidation event (`leaderboard:invalidate`, `lobbies:invalidate`, ...) at
 * exactly the moment its cached/derived data changes, and every subscribed
 * client re-fetches in one wave.
 *
 * This is `invalidateQueries`, never `setQueryData` — the events signal data the
 * client cannot recompute itself (ELO folds, server-side aggregations).
 *
 * Keys are serialised for the dependency array so an inline array literal does
 * not re-subscribe on every render.
 */
export function useSocketInvalidation(event: string, queryKeys: QueryKey[]) {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const keysJson = JSON.stringify(queryKeys);

  useEffect(() => {
    if (!socket) return;
    const keys: QueryKey[] = JSON.parse(keysJson);

    const handler = () => {
      for (const key of keys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    };

    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, keysJson, queryClient]);
}
