import { useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { ExecutionMode, SupportedLanguage } from "../types";

type EditorInstance = Parameters<OnMount>[0];

type MonacoIDEProps = {
  code: string;
  language: SupportedLanguage;
  oid: string;
  handleRunCode: (
    code: string,
    language: SupportedLanguage,
    oid: string,
    mode?: ExecutionMode,
  ) => Promise<void> | void;
  onCodeChange: (code: string) => void;
};

const MonacoIDE = ({ handleRunCode, language, code, oid, onCodeChange }: MonacoIDEProps) => {
  const editorRef = useRef<EditorInstance | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    monaco.editor.defineTheme("glass-theme", {
      base: "vs-dark",
      inherit: true,
      colors: {
        "editor.background": "#030712",
        "editor.foreground": "#e5e7eb",
        "editorCursor.foreground": "#e5e7eb",
        "editorLineNumber.foreground": "#9ca3af",
        "editor.lineHighlightBackground": "#37415130",
        "sideBar.background": "#030712",
        "sideBarTitle.foreground": "#9ca3af",
        "activityBar.background": "#030712",
        "activityBar.foreground": "#9ca3af",
      },
      rules: [
        { token: "comment", foreground: "6272a4", fontStyle: "italic" },
        { token: "string", foreground: "f1fa8c" },
        { token: "keyword", foreground: "ff79c6" },
        { token: "identifier", foreground: "50fa7b" },
        { token: "number", foreground: "bd93f9" },
        { token: "operators", foreground: "ff79c6" },
        { token: "delimiter", foreground: "f8f8f2" },
        { token: "white", fontStyle: "normal" },
        { token: "white.invisible", fontStyle: "normal" },
        { token: "bracket.round", foreground: "ff79c6" },
        { token: "bracket.square", foreground: "ff79c6" },
        { token: "bracket.curly", foreground: "ff79c6" },
        { token: "bracket.round.open", foreground: "ff79c6" },
        { token: "bracket.round.close", foreground: "ff79c6" },
        { token: "bracket.square.open", foreground: "ff79c6" },
        { token: "bracket.square.close", foreground: "ff79c6" },
        { token: "bracket.curly.open", foreground: "ff79c6" },
        { token: "bracket.curly.close", foreground: "ff79c6" },
      ],
    });

    monaco.editor.setTheme("glass-theme");

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRunCode(editor.getValue(), language, oid, "RUN");
    });
  };

  useEffect(() => {
    return () => {
      editorRef.current?.dispose();
    };
  }, []);

  return (
    <div className="h-full border border-white/10 rounded-xl overflow-hidden">
      <Editor
        height="100%"
        className="bg-[#030712]"
        language={language}
        value={code}
        options={{
          readOnly: false,
          minimap: { enabled: true },
          fontFamily: "'Fira Code', monospace",
          fontLigatures: true,
          automaticLayout: true,
          padding: { top: 20 },
          smoothScrolling: true,
          cursorBlinking: "expand",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          fontSize: 14,
        }}
        onChange={(value) => onCodeChange(value ?? "")}
        onMount={handleEditorDidMount}
      />
    </div>
  );
};

export default MonacoIDE;
