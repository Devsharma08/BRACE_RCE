import { Check, Search, UserPlus, Users, X } from "lucide-react";
import { useState } from "react";

interface PendingRequest {
  id: string;
  sender: { username: string };
}

interface FriendsWorkspaceHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  friendCount: number;
  requestCount: number;
  pendingRequests: PendingRequest[];
  onAcceptRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
}

export function FriendsWorkspaceHeader({
  searchQuery,
  onSearchChange,
  friendCount,
  requestCount,
  pendingRequests,
  onAcceptRequest,
  onRejectRequest,
}: FriendsWorkspaceHeaderProps) {
  const [requestsOpen, setRequestsOpen] = useState(false);

  return (
    <div className="relative shrink-0 border-b border-subtle-line bg-surface px-3 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-btn border border-accent-primary/25 bg-accent-primary/10 text-accent-primary">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black uppercase tracking-widest text-fg">Friends</h2>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-secondary">
              {friendCount} connected
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setRequestsOpen((open) => !open)}
          className="relative rounded-btn border border-subtle-line p-2 text-subtle transition-colors hover:border-accent-primary/40 hover:bg-accent-primary/10 hover:text-accent-primary"
          title="Friend requests"
          aria-label={`Friend requests${requestCount ? `, ${requestCount} pending` : ""}`}
        >
          <UserPlus className="h-3.5 w-3.5" />
          {requestCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-accent-warning px-1 text-center text-[9px] font-bold text-ink">
              {requestCount > 9 ? "9+" : requestCount}
            </span>
          )}
        </button>
      </div>
      <label className="relative block">
        <span className="sr-only">Search friends</span>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search friends"
          className="w-full rounded-btn border border-subtle-line bg-base py-2 pl-8 pr-3 text-xs text-fg outline-none transition-colors placeholder:text-muted focus:border-accent-primary"
        />
      </label>
      {requestsOpen && (
        <div className="absolute left-3 right-3 top-[calc(100%-0.5rem)] z-30 overflow-hidden rounded-card border border-subtle-line bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-subtle-line px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">Friend requests</span>
            <button type="button" onClick={() => setRequestsOpen(false)} className="rounded-btn p-1 text-muted hover:bg-surface-hover hover:text-fg" title="Close requests">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {pendingRequests.length === 0 ? (
            <p className="px-3 py-4 text-[10px] text-muted">No pending requests.</p>
          ) : (
            <div className="divide-y divide-subtle-line">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <span className="truncate text-xs font-bold text-fg">{request.sender.username}</span>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => onAcceptRequest(request.id)} className="rounded-btn border border-accent-success/30 p-1.5 text-accent-success hover:bg-accent-success/10" title="Accept request">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => onRejectRequest(request.id)} className="rounded-btn border border-accent-danger/30 p-1.5 text-accent-danger hover:bg-accent-danger/10" title="Reject request">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
