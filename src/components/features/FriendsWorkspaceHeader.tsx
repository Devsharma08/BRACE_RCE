import { Check, Search, UserPlus, Users, X, Send, Loader2, UserRoundSearch } from "lucide-react";
import { useState } from "react";

interface Friend {
  id: string;
  username: string;
  requestSent?: boolean;
}

interface PendingRequest {
  id: string;
  sender: { id?: string; username: string };
}

interface FriendsWorkspaceHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  friendCount: number;
  requestCount: number;
  pendingRequests: PendingRequest[];
  onAcceptRequest: (id: string, senderId: string) => void;
  onRejectRequest: (id: string) => void;
  /** Request id currently being accepted/rejected — disables its buttons. */
  actingRequestId?: string | null;
  discoverOpen: boolean;
  onToggleDiscover: () => void;
  discoverResults: Friend[];
  discoverQuery: string;
  onDiscoverQueryChange: (value: string) => void;
  discoverLoading: boolean;
  discoverError: string | null;
  onSendRequest: (userId: string, username: string) => void;
  sendingTo: string | null;
  existingFriendIds: string[];
}

export function FriendsWorkspaceHeader({
  searchQuery,
  onSearchChange,
  friendCount,
  requestCount,
  pendingRequests,
  onAcceptRequest,
  onRejectRequest,
  actingRequestId,
  discoverOpen,
  onToggleDiscover,
  discoverResults,
  discoverQuery,
  onDiscoverQueryChange,
  discoverLoading,
  discoverError,
  onSendRequest,
  sendingTo,
  existingFriendIds,
}: FriendsWorkspaceHeaderProps) {
  const [requestsOpen, setRequestsOpen] = useState(false);

  // Accept needs the SENDER's id, not just the request id — the server
  // reconnects both users using { requestId, senderId }.
  const handleAccept = (request: PendingRequest) => {
    const senderId = request.sender.id;
    if (!senderId) return;
    onAcceptRequest(request.id, senderId);
  };

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
        <div className="flex shrink-0 items-center gap-2">
          {/* ── ADD NEW FRIENDS ── the missing discover entry point */}
          <button
            type="button"
            onClick={onToggleDiscover}
            aria-expanded={discoverOpen}
            title="Find new friends"
            aria-label="Find new friends"
            className={`rounded-btn border p-2 transition-colors ${
              discoverOpen
                ? "border-accent-primary/60 bg-accent-primary/15 text-accent-primary"
                : "border-subtle-line text-subtle hover:border-accent-primary/40 hover:bg-accent-primary/10 hover:text-accent-primary"
            }`}
          >
            <UserRoundSearch className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setRequestsOpen((open) => !open)}
          className="relative rounded-btn border border-subtle-line p-2 text-subtle transition-colors hover:border-accent-primary/40 hover:bg-accent-primary/10 hover:text-accent-primary"
          title="Friend requests"
          aria-label={`Friend requests${requestCount ? `, ${requestCount} pending` : ""}`}
        >
          <UserPlus className="h-3.5 w-3.5" />
          {requestCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 z-10 min-w-4 rounded-full bg-accent-warning px-1 text-center text-[9px] font-bold leading-4 text-ink">
                {requestCount > 99 ? "99+" : requestCount}
              </span>
            )}
          </button>
        </div>
      </div>
      {/* ── DISCOVERY: search operatives + send a request ── */}
      {discoverOpen && (
        <div className="mb-3 rounded-card border border-accent-primary/25 bg-base/60 p-2.5">
          <label className="relative block">
            <span className="sr-only">Search new friends</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={discoverQuery}
              onChange={(event) => onDiscoverQueryChange(event.target.value)}
              placeholder="Search by username…"
              className="w-full rounded-btn border border-subtle-line bg-base py-2 pl-8 pr-3 text-xs text-fg outline-none transition-colors placeholder:text-muted focus:border-accent-primary"
            />
          </label>

          {discoverQuery.trim().length < 2 ? (
            <p className="px-1 pb-1 pt-2.5 text-[10px] leading-relaxed text-muted">
              Type at least 2 characters to search the operatives directory.
            </p>
          ) : (
            <div className="themed-scroll mt-2 max-h-56 overflow-y-auto">
              {discoverError ? (
                <p className="px-1 py-2 text-[10px] text-accent-danger">{discoverError}</p>
              ) : discoverLoading ? (
                <p className="flex items-center gap-2 px-1 py-2 text-[10px] text-muted">
                  <Loader2 className="h-3 w-3 animate-spin" /> Scanning directory…
                </p>
              ) : discoverResults.length === 0 ? (
                <p className="px-1 py-2 text-[10px] text-muted">
                  No operative matches “{discoverQuery.trim()}”.
                </p>
              ) : (
                <ul className="divide-y divide-subtle-line">
                  {discoverResults.map((candidate) => {
                    const alreadyFriend = existingFriendIds.includes(candidate.id);
                    const sent = candidate.requestSent;
                    return (
                      <li key={candidate.id} className="flex items-center justify-between gap-2 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-btn border border-accent-primary/20 bg-elevated text-[9px] font-bold text-accent-primary">
                            {candidate.username.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="truncate text-xs font-bold text-fg">
                            {candidate.username}
                          </span>
                        </div>

                        {alreadyFriend ? (
                          <span className="shrink-0 rounded-btn border border-accent-success/30 bg-accent-success/10 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-accent-success">
                            Friend
                          </span>
                        ) : sent ? (
                          <span className="shrink-0 rounded-btn border border-accent-warning/30 bg-accent-warning/10 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-accent-warning">
                            Requested
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSendRequest(candidate.id, candidate.username)}
                            disabled={sendingTo === candidate.id}
                            title={`Send friend request to ${candidate.username}`}
                            aria-label={`Send friend request to ${candidate.username}`}
                            className="flex shrink-0 items-center gap-1 rounded-btn border border-accent-primary/40 bg-accent-primary/10 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-accent-primary transition-colors hover:bg-accent-primary/20 disabled:opacity-50"
                          >
                            {sendingTo === candidate.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            Add
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Friend-list filter — hidden while discovering new people */}
      {!discoverOpen && (
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
      )}
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
              {pendingRequests.map((request) => {
                const acting = actingRequestId === request.id;
                const anyActing = actingRequestId != null;
                return (
                <div key={request.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <span className="truncate text-xs font-bold text-fg">{request.sender.username}</span>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      disabled={anyActing}
                      onClick={() => handleAccept(request)}
                      className="rounded-btn border border-accent-success/30 p-1.5 text-accent-success hover:bg-accent-success/10 disabled:cursor-wait disabled:opacity-60"
                      title="Accept request"
                    >
                      {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      disabled={anyActing}
                      onClick={() => onRejectRequest(request.id)}
                      className="rounded-btn border border-accent-danger/30 p-1.5 text-accent-danger hover:bg-accent-danger/10 disabled:cursor-wait disabled:opacity-60"
                      title="Reject request"
                    >
                      {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
