import { useContext, createContext, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../config/api'
import { useSocket } from './SocketContext';

interface User {
    id: string;
    email: string;
    username: string;
    avatarUrl?: string | null;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}:{children:ReactNode}) => {
    const queryClient = useQueryClient();
    // Socket identity is attached at handshake time, so the stale connection
    // must be torn down on logout — otherwise it keeps the old user's id.
    const { rawSocketRef } = useSocket();

    const { data: user = null, isLoading, refetch } = useQuery<User | null>({
        queryKey: ["auth-me"],
        queryFn: async () => {
            try {
                const response: { data: { user: User } } = await api.get("/auth/me");
                return response.data?.user || null;
            } catch (error) {
                console.error("Auth check failed:", error);
                return null;
            }
        },
        staleTime: 1000 * 60 * 15, // 15 mins cache for auth state
    });

    const isAuthenticated = !!user;

    async function checkAuth() {
        await refetch();
    }

    async function logout() {
        try {
            await api.post("/auth/signout");
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            // Fresh socket on next login gets the new identity at handshake.
            rawSocketRef.current?.disconnect();
            rawSocketRef.current = null;
            queryClient.setQueryData(["auth-me"], null);
            // Full-slate reset — the next login belongs to a different user,
            // so no socket- or user-scoped cache may survive.
            queryClient.invalidateQueries();
        }
    }

    return (
        <AuthContext.Provider value={{user, logout, isAuthenticated, isLoading, checkAuth}}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if(!context){
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context
}

