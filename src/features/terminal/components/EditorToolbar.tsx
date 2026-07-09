import { FileCode, Play, Send } from "lucide-react";

type EditorToolbarProps = {
  disabled: boolean;
  fileName: string;
  onRun: () => void;
  onSubmit: () => void;
};

const EditorToolbar = ({ disabled, fileName, onRun, onSubmit }: EditorToolbarProps) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-white/10">
      <div className="flex items-center gap-2">
        <FileCode className="w-4 h-4 text-orange-500" />
        <span className="text-sm text-gray-300 font-medium">{fileName}</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRun}
          disabled={disabled}
          className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md text-sm transition-colors ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Play className="w-4 h-4" />
          Run
        </button>

        <button
          onClick={onSubmit}
          disabled={disabled}
          className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md text-sm transition-colors ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Send className="w-4 h-4" />
          Submit
        </button>
      </div>
    </div>
  );
};

export default EditorToolbar;
