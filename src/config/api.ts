import axios from "axios"

export const backendURL = import.meta.env.VITE_BACKEND_URL;
export const api = axios.create({
    baseURL : backendURL,
    headers : {
        "Content-Type" : "application/json",
    },
    withCredentials : true,
});