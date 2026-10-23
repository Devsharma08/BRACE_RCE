import { useContext, useRef,createContext, type ReactNode, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, fetchCsrfToken } from '../config/api'
import { clearSocketSingleton } from './SocketContext';

interface User {
    id: string;
    email: string;
    username: string;
    avatarUrl?: string | null;
    role?: string | null;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isAdmin: boolean;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

// Module-level singleton matching SocketContext's pattern: ensures the context
// is the SAME instance across all imports — including duplicate module copies
// emitted alongside sources (the stray *.js files). A plain module-level
// `createContext` would produce different context instances across duplicate
// module copies, so `useAuth()` inside SocketProvider would get `undefined`
// while AuthProvider set the context on a different instance.
function getAuthContext(): React.Context<AuthContextType | undefined> {
  const bag = globalThis as typeof globalThis & {
    __brace_rce_auth_context__?: React.Context<AuthContextType | undefined>;
  };
  if (!bag.__brace_rce_auth_context__) {
    bag.__brace_rce_auth_context__ = createContext<AuthContextType | undefined>(undefined);
  }
  return bag.__brace_rce_auth_context__;
}

const AuthContext = getAuthContext();

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const queryClient = useQueryClient();

    const prevUserIdRef = useRef<string | null>(null);

    // Fetch CSRF token on app initialization
    useEffect(() => {
        fetchCsrfToken().catch(() => {
            // Silent fail - CSRF token will be fetched on first mutating request
        });
    }, []);

    const { data: user = null, isLoading, refetch } = useQuery<User | null>({
        queryKey: ["auth-me"],
        queryFn: async () => {
            try {
                const response = await api.get("/auth/me");
                return response.data?.user || null;
            } catch (error: any) {
                // A 401 here is the expected "not signed in yet" state on a cold
                // load — it drives the login redirect, so it is not an error and
                // must not spam the console. Only surface unexpected failures.
                if (error?.response?.status !== 401) {
                    console.error("Auth check failed:", error);
                }
                return null;
            }
        },
        staleTime: 1000 * 60 * 15,
    });

    // React to user identity changes: clear old socket when user switches/logs out
    useEffect(() => {
        const currentUserId = user?.id ?? null;
        const previousUserId = prevUserIdRef.current;

        if (currentUserId !== previousUserId) {
            // User changed (login, logout, or account switch)
            if (previousUserId) {
                clearSocketSingleton(previousUserId);
            }
            prevUserIdRef.current = currentUserId;
        }
    }, [user?.id]);

    const isAuthenticated = !!user;
    const isAdmin = (user?.role ?? '').toUpperCase() === 'ADMIN';

    const checkAuth = useCallback(async () => {
        await refetch();
    }, [refetch]);

    const logout = useCallback(async () => {
        try {
            await api.post("/auth/signout");
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            clearSocketSingleton(user?.id);
            queryClient.setQueryData(["auth-me"], null);
            queryClient.invalidateQueries({ queryKey: ["auth"] });
        }
    }, [user?.id, queryClient]);

    const value = useMemo(() => ({
        user,
        logout,
        isAuthenticated,
        isAdmin,
        isLoading,
        checkAuth,
    }), [user, logout, isAuthenticated, isAdmin, isLoading, checkAuth]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context
}

