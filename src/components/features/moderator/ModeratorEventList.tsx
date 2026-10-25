import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Search,
  Users,
  ShieldAlert,
  Lock,
  Play,
  Pause,
} from "lucide-react";
import {
  ModeratorEventListItem,
  ModeratorEventsQuery,
} from "../../../hooks/useModeratorEvents";

const STATUS_COLORS: Record<string, string> = {
  WAITING: "border-accent-warning/30 bg-accent-warning/10 text-accent-warning",
  IN_PROGRESS:
    "border-accent-primary/30 bg-accent-primary/10 text-accent-primary",
  FINISHED: "border-accent-success/30 bg-accent-success/10 text-accent-success",
  EXPIRED: "border-accent-danger/30 bg-accent-danger/10 text-accent-danger",
};

const TYPE_COLORS: Record<string, string> = {
  PUBLIC: "border-accent-primary/20 text-accent-primary",
  PRIVATE: "border-accent-violet/20 text-accent-violet",
  FRIENDS: "border-accent-success/20 text-accent-success",
  ONE_VS_ONE: "border-accent-warning/20 text-accent-warning",
  CUSTOM: "border-accent-pink/20 text-accent-pink",
  TOURNAMENT: "border-accent-danger/20 text-accent-danger",
};

interface ModeratorEventListProps {
  events: ModeratorEventListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: ModeratorEventsQuery;
  onFiltersChange: (filters: Partial<ModeratorEventsQuery>) => void;
  onPageChange: (page: number) => void;
  onSelectEvent: (eventId: string) => void;
}

export function ModeratorEventList({
  events,
  pagination,
  filters,
  onFiltersChange,
  onPageChange,
  onSelectEvent,
}: ModeratorEventListProps) {
  const [sortBy, setSortBy] = useState<
    "createdAt" | "startedAt" | "finishedAt" | "participants" | "status"
  >("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (aVal === bVal) return 0;
      const comparison = aVal < bVal ? -1 : 1;
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [events, sortBy, sortOrder]);

  const statusOptions = [
    "WAITING",
    "IN_PROGRESS",
    "FINISHED",
    "EXPIRED",
  ] as const;
  const typeOptions = [
    "PUBLIC",
    "PRIVATE",
    "FRIENDS",
    "ONE_VS_ONE",
    "CUSTOM",
    "TOURNAMENT",
  ] as const;

  return (
    <div className="flex flex-col gap-6 min-w-0">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-subtle-line pb-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-faint" />
          <input
            type="text"
            placeholder="Search events by name, code, or host..."
            value={filters.search || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value, page: 1 })
            }
            className="h-9 w-full rounded-btn border border-subtle-line bg-raised px-3 text-xs text-fg outline-none placeholder:text-faint focus:border-accent/50 sm:w-64"
          />
        </div>

        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <button
            onClick={() => {
              const next = filters.status === undefined ? "WAITING" : undefined;
              onFiltersChange({ ...filters, status: next, page: 1 });
            }}
            className={`px-2 py-1 text-[9px] rounded-btn border ${
              filters.status === "WAITING"
                ? "border-accent-warning/40 bg-accent-warning/10 text-accent-warning"
                : "border-subtle-line text-subtle hover:border-accent/40"
            }`}
          >
            Waiting
          </button>
          <button
            onClick={() => {
              const next =
                filters.status === undefined ? "IN_PROGRESS" : undefined;
              onFiltersChange({ ...filters, status: next, page: 1 });
            }}
            className={`px-2 py-1 text-[9px] rounded-btn border ${
              filters.status === "IN_PROGRESS"
                ? "border-accent-primary/40 bg-accent-primary/10 text-accent-primary"
                : "border-subtle-line text-subtle hover:border-accent/40"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => {
              const next =
                filters.status === undefined ? "FINISHED" : undefined;
              onFiltersChange({ ...filters, status: next, page: 1 });
            }}
            className={`px-2 py-1 text-[9px] rounded-btn border ${
              filters.status === "FINISHED"
                ? "border-accent-success/40 bg-accent-success/10 text-accent-success"
                : "border-subtle-line text-subtle hover:border-accent/40"
            }`}
          >
            Finished
          </button>
        </div>
      </div>

      {/* Events table */}
      <div className="overflow-x-auto min-w-0 border border-subtle-line rounded-card">
        <table className="w-full text-left text-[10px] font-mono">
          <thead className="border-b border-subtle-line bg-raised/50">
            <tr>
              <th
                className="px-3 py-3 text-faint uppercase tracking-widest cursor-pointer hover:text-fg"
                onClick={() => {
                  setSortBy(sortBy === "createdAt" ? "createdAt" : "createdAt");
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                }}
              >
                Room
              </th>
              <th className="px-3 py-3 text-faint uppercase tracking-widest">
                Host
              </th>
              <th className="px-3 py-3 text-faint uppercase tracking-widest">
                Type
              </th>
              <th className="px-3 py-3 text-faint uppercase tracking-widest text-right">
                Participants
              </th>
              <th className="px-3 py-3 text-faint uppercase tracking-widest text-right">
                Pass Rate
              </th>
              <th className="px-3 py-3 text-faint uppercase tracking-widest text-right">
                Status
              </th>
              <th className="px-3 py-3 text-faint uppercase tracking-widest text-right">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle-line">
            {sortedEvents.map((event) => (
              <tr
                key={event.id}
                onClick={() => onSelectEvent(event.id)}
                className="cursor-pointer hover:bg-accent/5 transition-colors group"
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-surface-hover border border-subtle-line flex items-center justify-center text-[9px] font-bold text-fg shrink-0">
                      {event.roomCode?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <span className="block font-bold text-fg truncate">
                        {event.name || "Untitled Event"}
                      </span>
                      <span className="block text-[9px] text-faint font-mono truncate">
                        #{event.roomCode}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-surface-hover border border-subtle-line flex items-center justify-center text-[8px] font-bold text-fg shrink-0">
                      {event.host.username?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span className="text-xs text-fg truncate min-w-0">
                      {event.host.username}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${TYPE_COLORS[event.type]}`}
                  >
                    {event.type}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-faint shrink-0" />
                    <span className="font-bold text-fg">
                      {event.participantCount}
                    </span>
                    <span className="text-[9px] text-faint">
                      /{event.maxUsers}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <span
                    className={`font-bold ${event.summary.passRate >= 50 ? "text-accent-success" : event.summary.passRate > 0 ? "text-accent-warning" : "text-accent-danger"}`}
                  >
                    {event.summary.passRate}%
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${STATUS_COLORS[event.status]}`}
                  >
                    {event.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="text-[9px] text-faint font-mono">
                    {new Date(event.createdAt).toLocaleDateString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-subtle-line pt-3 font-mono text-[9px] text-faint">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="grid h-7 w-7 place-items-center rounded-btn border border-subtle-line text-subtle transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={13} />
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="grid h-7 w-7 place-items-center rounded-btn border border-subtle-line text-subtle transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={13} />
            </button>
          </div>
          <span className="text-[9px]">{pagination.total} total events</span>
        </div>
      )}
    </div>
  );
}
