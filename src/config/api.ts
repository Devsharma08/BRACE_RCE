import axios from "axios"

const rawUrl = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/+$/, "");
export const backendURL = rawUrl.endsWith("/api") ? rawUrl : `${rawUrl}/api`;

export const api = axios.create({
    baseURL: backendURL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});