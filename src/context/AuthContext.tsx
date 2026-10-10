import { useContext, createContext, useRef, type ReactNode, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, fetchCsrfToken } from '../config/api'
import { useSocket, clearSocketSingleton } from './SocketContext';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const queryClient = useQueryClient();
    
    let rawSocketRef: React.MutableRefObject<any> = { current: null };
    try {
      const socketContext = useSocket();
      rawSocketRef = socketContext.rawSocketRef;
    } catch {
      rawSocketRef = { current: null };
    }

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
            } catch (error) {
                console.error("Auth check failed:", error);
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

    async function checkAuth() {
        await refetch();
    }

    async function logout() {
        try {
            await api.post("/auth/signout");
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            rawSocketRef.current?.disconnect();
            rawSocketRef.current = null;
            if (user?.id) clearSocketSingleton(user.id);
            queryClient.setQueryData(["auth-me"], null);
            queryClient.invalidateQueries();
        }
    }

    return (
        <AuthContext.Provider value={{ user, logout, isAuthenticated, isAdmin, isLoading, checkAuth }}>
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

