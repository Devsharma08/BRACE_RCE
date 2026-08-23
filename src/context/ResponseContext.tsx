import { createContext } from "react";

export type ResponseStatus = "SUCCESS" | "ERROR" | "LOADING" | "IDLE";

export type UserResponseContextType = {
    responseContent: string;
    status: ResponseStatus;
    setStatus: (status: ResponseStatus) => void;
    setResponseContent: (responseContent: string) => void;
}

export const UserResponseContext = createContext<UserResponseContextType>({
    responseContent: "",
    status: "IDLE",
    setStatus: () => {},
    setResponseContent: () => {},
});