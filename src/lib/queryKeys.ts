// Centralized TanStack Query key factory
// Ensures consistent key structure and enables proper invalidation

// Helper to create query keys with optional params (filters out null/undefined)
function createKey(...parts: (string | object | null | undefined)[]): readonly (string | object)[] {
  return parts.filter((v): v is string | object => v != null);
}

export const queryKeys = {
  // Auth
  auth: {
    me: () => ['auth', 'me'] as const,
  },

  // Problems - structured with optional filters
  problems: {
    system: (filters?: { userId?: string; includeProgress?: boolean }) =>
      createKey('problems', 'system', filters),
    detail: (id: string) => ['problems', 'detail', id] as const,
    search: (params: { query?: string; difficulty?: string; tags?: string[] }) =>
      ['problems', 'search', params] as const,
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