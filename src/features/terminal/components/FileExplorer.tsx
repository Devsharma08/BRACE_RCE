import { FileCode } from "lucide-react";
import type { MouseEvent } from "react";
import type { FileEntry } from "../../../context/fileNamesContext";

type FileExplorerProps = {
  activeFile: string | null;
  files: FileEntry[];
  sidebarWidth: number;
  onFileClick: (oid: string, name: string) => void;
  onResizeStart: (event: MouseEvent<HTMLDivElement>) => void;
};

const FileExplorer = ({
  activeFile,
  files,
  sidebarWidth,
  onFileClick,
  onResizeStart,
}: FileExplorerProps) => {
  return (
    <>
      <aside
        style={{
          width: `${sidebarWidth}px`,
          height: "100%",
        }}
        className="h-full border-r border-white/10 bg-[#252526] flex flex-col overflow-y-auto"
      >
        <div className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-white/10">
          Explorer
        </div>
        <div className="flex-1 overflow-y-auto">
          {files.map((file) => (
            <button
              key={file.oid || file.name}
              onClick={() => onFileClick(file.oid, file.name)}
              className={`p-2 w-full text-left text-sm hover:bg-white/10 flex items-center gap-2 ${
                activeFile === file.oid ? "bg-white/10" : ""
              }`}
            >
              <FileCode className="w-4 h-4 text-orange-500" />
              {file.name}
            </button>
          ))}
        </div>
      </aside>
      <div
        onMouseDown={onResizeStart}
        className="w-2 h-full bg-white/10 hover:bg-white/20 transition-colors active:color-white/80 cursor-col-resize"
      />
    </>
  );
};

export default FileExplorer;
