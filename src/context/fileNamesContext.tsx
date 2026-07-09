import { createContext } from "react";

export type FileEntry = {
    name: string;
    oid: string;
    downloadUrl?: string;
    type?: string;
    path?: string;
}

export type FileNamesContextType = {
    filesData: FileEntry[];
    setFilesData: (fileNames: FileEntry[]) => void;
}

export const FileNamesContext = createContext<FileNamesContextType>({
    filesData: [],
    setFilesData: () => {}
});