// Centralized TanStack Query key factory
// Ensures consistent key structure and enables proper invalidation

// Helper to create query keys with optional params (filters out null/undefined)
function createKey(...parts: (string | object | null | undefined)[]): readonly (string | object)[] {
  return parts.filter((v): v is string | object => v != null);
}

/**
 * Payload shape version for every problems query key.
 *
 * Problems queries are fetched with `staleTime: Infinity`, so a tab that mounted
 * before a payload shape change keeps the OLD payload for its whole session and
 * never re-fetches. Embedding this version in the key means a shape change
 * yields a new cache entry, so the fresh payload is fetched instead of replaying
 * a stale one.
 *
 * Kept in sync with PROBLEM_PAYLOAD_VERSION in utils/problemCache.ts — that one
 * documents the reason, this one owns the key.
 *
 * v2: test cases now ship with their real input and expected output instead of
 * arriving blanked.
 */
const PROBLEMS_PAYLOAD_V = 2;

export const queryKeys = {
  // Auth
  auth: {
    me: () => ['auth', 'me'] as const,
  },

  // Problems - structured with optional filters
  // The `v${PROBLEMS_PAYLOAD_V}` segment sits under the "problems" prefix, so
  // invalidateQueries({ queryKey: ['problems'] }) still matches every variant.
  problems: {
    system: (filters?: { userId?: string; includeProgress?: boolean }) =>
      createKey('problems', `v${PROBLEMS_PAYLOAD_V}`, 'system', filters),
    detail: (id: string) => ['problems', `v${PROBLEMS_PAYLOAD_V}`, 'detail', id] as const,
    search: (params: { query?: string; difficulty?: string; tags?: string[] }) =>
      ['problems', `v${PROBLEMS_PAYLOAD_V}`, 'search', params] as const,
  },

  // Battle
  battle: {
    room: (roomId: string, spectate?: boolean) =>
      ['battle', 'room', roomId, { spectate }] as const,
    lobby: () => ['battle', 'lobby'] as const,
  },

  // Leaderboard
  leaderboard: {
    list: (limit: number) => ['leaderboard', 'list', limit] as const,
    me: () => ['leaderboard', 'me'] as const,
  },

  // Analytics
  analytics: {
    user: () => ['analytics', 'user'] as const,
  },

  // Notifications
  notifications: {
    list: (unreadOnly?: boolean) => ['notifications', unreadOnly ? 'unread' : 'all'] as const,
    unreadCount: () => ['notifications', 'unreadCount'] as const,
  },

  // Admin
  admin: {
    users: () => ['admin', 'users'] as const,
    questions: () => ['admin', 'questions'] as const,
    verify: () => ['admin', 'verify'] as const,
  },

  // Learning paths
  learningPaths: {
    list: () => ['learning-paths'] as const,
    detail: (id: string) => ['learning-paths', id] as const,
  },

  // Profile
  profile: {
    me: () => ['profile', 'me'] as const,
    stats: (userId?: string) => createKey('profile', 'stats', userId),
  },

  // Dashboard
  dashboard: {
    profile: (userId?: string) => createKey('dashboard', 'profile', userId),
    stats: (userId?: string) => createKey('dashboard', 'stats', userId),
    problems: (userId?: string) => createKey('dashboard', 'problems', userId),
  },

  // Rooms
  rooms: {
    lobby: () => ['rooms', 'lobby'] as const,
    templates: () => ['rooms', 'templates'] as const,
    myEvents: () => ['rooms', 'my-events'] as const,
    detail: (id: string) => ['rooms', 'detail', id] as const,
  },
} as const;

// Helper to invalidate all problem-related queries
export function invalidateAllProblems(queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: ['problems'] });
}

// Helper to invalidate all battle-related queries
export function invalidateAllBattles(queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: ['battle'] });
}

// Helper to invalidate all leaderboard-related queries
export function invalidateAllLeaderboards(queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
}

// Helper to invalidate all analytics-related queries
export function invalidateAllAnalytics(queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: ['analytics'] });
}