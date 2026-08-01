import { useRef, useEffect } from "react";
import Editor, { type OnMount, type Monaco } from "@monaco-editor/react";
import { Loader2 } from "lucide-react";
import type { ExecutionMode, SupportedLanguage } from "../types";

type EditorInstance = Parameters<OnMount>[0];
type FormattingModel = {
  getLinesContent: () => string[];
};
type FormattingEdit = {
  range: InstanceType<Monaco["Range"]>;
  text: string;
};

type MonacoIDEProps = {
  code: string;
  language: SupportedLanguage;
  oid: string;
  fileKey: string;
  handleRunCode: (
    code: string,
    language: SupportedLanguage,
    oid: string,
    mode?: ExecutionMode,
  ) => Promise<void> | void;
  onCodeChange: (code: string) => void;
  onFormatMount?: (formatAction: () => void) => void;
};

const JAVA_BOILERPLATE = [
  "import java.util.*;",
  "import java.io.*;",
  "import java.math.*;",
  "",
  "class Solution {",
  "    public static void main(String[] args) {",
  "// --- DO NOT ALTER ABOVE THIS LINE ---",
  "        // Your code here",
  "    }",
  "}",
].join("\n");

const MonacoIDE = ({ handleRunCode, language, code, oid, fileKey, onCodeChange, onFormatMount }: MonacoIDEProps) => {
  const editorRef = useRef<EditorInstance | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const lastFileKeyRef = useRef<string | null>(null);
  const decorationsRef = useRef<string[]>([]); // Prevents visual decoration memory leaks
  const propsRef = useRef({ handleRunCode, language, oid });

  const isLocal = oid && oid.startsWith("local-");

  useEffect(() => {
    propsRef.current = { handleRunCode, language, oid };
  }, [handleRunCode, language, oid]);

  const applyJavaDecorations = (editor: EditorInstance, monaco: Monaco) => {
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: new monaco.Range(1, 1, 7, 1),
        options: {
          isWholeLine: true,
          className: "bg-white/[0.02] opacity-60 select-none",
          glyphMarginClassName: "opacity-40",
        },
      },
    ]);
  };

  const configureEditorThemes = (monaco: Monaco) => {
    monaco.editor.defineTheme("dark-theme", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6b7280", fontStyle: "italic" },
        { token: "keyword", foreground: "82aaff", fontStyle: "bold" },
        { token: "keyword.operator", foreground: "f5c24d" },
        { token: "number", foreground: "f78c6c" },
        { token: "string", foreground: "c3e88d" },
        { token: "delimiter.bracket", foreground: "c792ea" },
        { token: "type", foreground: "7fdbca" },
        { token: "class", foreground: "ffcb6b", fontStyle: "bold" },
        { token: "variable", foreground: "d6deeb" },
        { token: "function", foreground: "82cfff" },
      ],
      colors: {
        "editor.background": "#01050f",
        "editor.foreground": "#d6deeb",
        "editorLineNumber.foreground": "#3b424e",
        "editorLineNumber.activeForeground": "#88c0d0",
        "editorCursor.foreground": "#7fdbca",
        "editor.selectionBackground": "#334e68",
        "editorLineHighlightBackground": "#112131",
      },
    });

    // Custom Formatting Provider for Java Code Spacing Alignment
    monaco.languages.registerDocumentFormattingEditProvider("java", {
      provideDocumentFormattingEdits(model: FormattingModel): FormattingEdit[] {
        const lines: string[] = model.getLinesContent();
        let indentLevel = 0;
        const edits: FormattingEdit[] = [];

        lines.forEach((line: string, index: number) => {
          const trimmed = line.trim();

          // 🔍 Check for closing braces even if followed by comments or keywords (e.g. } else {)
          if (/^(\s*\})/i.test(trimmed)) {
            indentLevel = Math.max(0, indentLevel - 1);
          }

          const targetIndent = "    ".repeat(indentLevel);
          const formattedLine = trimmed === "" ? "" : targetIndent + trimmed;

          edits.push({
            range: new monaco.Range(index + 1, 1, index + 1, line.length + 1),
            text: formattedLine,
          });

          // 🔍 Look for an opening brace anywhere before an optional comment block
          if (/\{([^}*]*|(\/\/.*))?$/i.test(trimmed)) {
            indentLevel++;
          }
        });

        return edits;
      },
    });
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    lastFileKeyRef.current = fileKey; // Initialize to prevent double setValue on mount
    configureEditorThemes(monaco);
    monaco.editor.setTheme("dark-theme");

    // Expose a programmatic formatting action to the toolbar.
    onFormatMount?.(() => {
      editor.getAction("editor.action.formatDocument")?.run();
    });

    // Shortcut for Shift + Alt + F manual layout formatting passes
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      editor.getAction("editor.action.formatDocument")?.run();
    });

    if (language === "java" && !editor.getValue() && !isLocal) {
      editor.setValue(JAVA_BOILERPLATE);
      applyJavaDecorations(editor, monaco);
    }

    if (language === "java" && !isLocal) {
      editor.onDidChangeCursorPosition((e) => {
        const selection = editor.getSelection();
        if (selection && selection.isEmpty()) {
          if (e.position.lineNumber < 8) {
            editor.setPosition({ lineNumber: 8, column: 9 });
          }
        }
      });
    }

    // Map CMD/CTRL + ENTER keyboard execution handler
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      const { handleRunCode: run, language: lang, oid: id } = propsRef.current;
      
      // Auto-format the layout contents directly prior to server execution
      editor.getAction("editor.action.formatDocument")?.run();
      
      // Introduce a microscopic timeout macro-task to let Monaco finish spacing before extraction
      setTimeout(() => {
        run(editor.getValue(), lang, id, "RUN");
      }, 50);
    });
  };

  // 🔄 Update editor content when active file changes or code is updated externally
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (editor && monaco && oid) {
      const currentVal = editor.getValue();
      const targetVal = code || (language === "java" ? JAVA_BOILERPLATE : "");

      if (lastFileKeyRef.current !== fileKey || targetVal !== currentVal) {
        lastFileKeyRef.current = fileKey;
        editor.setValue(targetVal);

        if (language === "java" && !isLocal) {
          applyJavaDecorations(editor, monaco);
        } else {
          decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
        }
      }
    }
  }, [fileKey, oid, code, language, isLocal]);

  // 🔄 Monitor Context clearing/reset actions safely
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (editor && monaco) {
      if (code === "" || code === null) {
        if (language === "java" && !isLocal) {
          editor.setValue(JAVA_BOILERPLATE);
          applyJavaDecorations(editor, monaco);
        } else {
          decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
          editor.setValue("");
        }
      }
    }
  }, [code, language, isLocal]);

  return (
    <div className="h-full min-h-0 overflow-hidden border border-white/10 bg-[#01050f] sm:rounded-xl">
      <Editor
        height="100%"
        language={language}
        defaultValue={code || (language === "java" ? JAVA_BOILERPLATE : "")}
        loading={
          <div className="flex h-full min-h-[220px] items-center justify-center gap-3 bg-[#01050f] text-sm font-medium text-indigo-200">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-300" />
            Loading workspace modules...
          </div>
        }
        options={{
          minimap: { enabled: false },
          fontFamily: "'Fira Code', monospace",
          fontLigatures: true,
          automaticLayout: true,
          padding: { top: 20 },
          smoothScrolling: true,
          cursorBlinking: "expand",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          fontSize: 14,
          formatOnType: true,
          formatOnPaste: true,
          autoIndent: "full",
        }}
        onChange={(value) => onCodeChange(value ?? "")}
        onMount={handleEditorDidMount}
      />
    </div>
  );
};

export default MonacoIDE;
