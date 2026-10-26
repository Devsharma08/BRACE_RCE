import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, ChevronLeft, Clock } from "lucide-react";
import {
  type ModeratorEventsQuery,
  useModeratorEvents,
  useEventAnalyticsDetail,
  invalidateModeratorEvents,
} from "../../../hooks/useModeratorEvents";
import type { QueryClient } from "@tanstack/react-query";
import { ModeratorEventList } from "./ModeratorEventList";
import { EventAnalyticsDetailView } from "./EventAnalyticsDetail";

interface ModeratorAnalyticsPageProps {
  queryClient: QueryClient;
}

export function ModeratorAnalyticsPage({
  queryClient,
}: ModeratorAnalyticsPageProps) {
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ModeratorEventsQuery>({
    page: 1,
    limit: 25,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const navigateHome = () => navigate("/");

  const { data, isLoading, error, refetch } = useModeratorEvents({
    ...filters,
    page,
  });

  const { data: eventDetail, isLoading: detailLoading } =
    useEventAnalyticsDetail(
      selectedEventId || "",
      view === "detail" && Boolean(selectedEventId),
    );

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setView("detail");
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setFilters({ ...filters, page: newPage });
  };

  const handleFiltersChange = (newFilters: Partial<ModeratorEventsQuery>) => {
    setFilters({ ...filters, ...newFilters, page: 1 });
    setPage(1);
  };

  // Detail view
  if (view === "detail" && selectedEventId && eventDetail) {
    return (
      <EventAnalyticsDetailView
        analytics={eventDetail}
        onBack={() => {
          setView("list");
          setSelectedEventId(null);
        }}
      />
    );
  }

  // List view (also shown when detail data is still loading or event not found)
  return (
    <div className="flex flex-col gap-6 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-subtle-line pb-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-accent-primary" />
          <h1 className="text-2xl font-bold text-fg tracking-tight">
            Moderator Analytics
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-[10px] font-mono text-faint hover:text-fg"
          >
            <ChevronLeft size={13} /> Dashboard
          </Link>
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-[10px] text-faint font-mono max-w-2xl">
        Monitor custom room events, review participant performance, and analyze
        battle outcomes across all hosted operations.
      </p>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-[10px] text-faint">Loading events...</p>
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-[10px] text-accent-danger">
            Failed to load events. Please try again.
          </p>
        </div>
      ) : (
        <ModeratorEventList
          events={data?.events || []}
          pagination={
            data?.pagination || {
              page: 1,
              limit: 25,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false,
            }
          }
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onPageChange={handlePageChange}
          onSelectEvent={handleSelectEvent}
        />
      )}
    </div>
  );
}
