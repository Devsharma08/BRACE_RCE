import { Fragment, useEffect, useRef, useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { Highlight, type PrismTheme } from "prism-react-renderer";
import {
  DS_ALGORITHMS,
  type AlgorithmEntry,
} from "../../data/dsAlgorithms";

const LANGUAGES = ["python", "javascript", "cpp"] as const;
type Language = (typeof LANGUAGES)[number];

const LANGUAGE_LABEL: Record<Language, string> = {
  python: "PYTHON",
  javascript: "JAVASCRIPT",
  cpp: "C++",
};

// Prism language ids for the three supported languages.
const PRISM_LANGUAGE: Record<Language, string> = {
  python: "python",
  javascript: "javascript",
  cpp: "cpp",
};

// Token colors ride the design tokens (no hardcoded hex — same rule as the
// rest of the app); plain text keeps transparent bg over the pane surface.
const tokenTheme: PrismTheme = {
  plain: { color: "var(--text-primary)", backgroundColor: "transparent" },
  styles: [
    { types: ["comment", "prolog", "doctype", "cdata"], style: { color: "var(--text-muted)", fontStyle: "italic" } },
    { types: ["keyword", "control", "directive", "unit"], style: { color: "var(--accent-violet)" } },
    { types: ["string", "char", "attr-value"], style: { color: "var(--accent-success)" } },
    { types: ["function", "method"], style: { color: "var(--accent-primary)" } },
    { types: ["number", "boolean", "constant"], style: { color: "var(--accent-warning)" } },
    { types: ["operator", "punctuation", "entity"], style: { color: "var(--text-secondary)" } },
    { types: ["class-name", "builtin", "tag", "attr-name"], style: { color: "var(--accent-pink)" } },
  ],
};

function resolveTopic(slug: string) {
  return (
    DS_ALGORITHMS[slug] ??
    Object.values(DS_ALGORITHMS).find((topic) => topic.slugs.includes(slug))
  );
}

/** Bash-style pane: title bar (terminal path · language select · copy). */
function CodePane({
  label,
  code,
  language,
  onLanguageChange,
  languageLabel,
}: {
  label: string;
  code: string;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  languageLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const ta = document.createElement("textarea");
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col border border-subtle-line bg-editor-bg">
      <div className="flex items-center justify-between gap-3 border-b border-subtle-line bg-black/60 px-3 py-2">
        <span className="flex min-w-0 items-center gap-2 text-[9px] font-mono font-bold uppercase tracking-widest text-faint">
          <Terminal className="h-3 w-3 shrink-0 text-accent-primary/50" />
          <span className="truncate">~/{label.toLowerCase()}</span>
          <span className="shrink-0 text-accent-primary/70">· {languageLabel}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <select
            aria-label={`${label} language`}
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as Language)}
            className="border border-subtle-line bg-black/60 px-2 py-1 text-[9px] font-mono uppercase tracking-widest text-faint outline-none transition-colors focus:border-accent-primary/60"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_LABEL[lang]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={copy}
            aria-label={`Copy ${label.toLowerCase()} to clipboard`}
            className={`flex items-center gap-1 border px-2 py-1 text-[9px] font-mono uppercase tracking-widest transition-colors ${
              copied
                ? "border-accent-success/50 text-accent-success"
                : "border-subtle-line text-faint hover:border-accent-primary/50 hover:text-accent-primary"
            }`}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "COPIED" : "COPY"}
          </button>
        </span>
      </div>
      <Highlight theme={tokenTheme} code={code} language={PRISM_LANGUAGE[language]}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre className="min-h-0 flex-1 overflow-x-auto p-4 text-[11px] leading-5">
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

function AlgorithmCard({ entry, index }: { entry: AlgorithmEntry; index: number }) {
  const [language, setLanguage] = useState<Language>("python");
  const ordinal = String(index + 1).padStart(2, "0");

  return (
    <article
      id={`alg-${entry.id}`}
      className="scroll-mt-24 overflow-hidden border border-subtle-line bg-black/60"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-subtle-line bg-black/40 px-4 py-3">
        <span className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-[10px] font-mono font-bold uppercase tracking-widest text-accent-primary/80">
            ALG // {ordinal}
          </span>
          <span className="truncate font-mono text-xs font-bold text-fg">{entry.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-faint">
          <span className="border border-subtle-line px-2 py-0.5">{entry.timeComplexity}</span>
          <span className="hidden border border-subtle-line px-2 py-0.5 sm:inline">
            {entry.spaceComplexity.split(" ")[0]}
          </span>
        </span>
      </header>

      <div className="space-y-4 p-4">
        <p className="text-xs leading-6 text-subtle">{entry.idea}</p>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Pseudocode follows the same language switch as the implementation. */}
          <CodePane
            label="PSEUDOCODE"
            code={entry.pseudocode[language].join("\n")}
            language={language}
            onLanguageChange={setLanguage}
            languageLabel={LANGUAGE_LABEL[language]}
          />
          <CodePane
            label="IMPLEMENTATION"
            code={entry.implementations[language]}
            language={language}
            onLanguageChange={setLanguage}
            languageLabel={LANGUAGE_LABEL[language]}
          />
        </div>
      </div>
    </article>
  );
}

export function AlgorithmLibrary({ slug }: { slug: string }) {
  const topic = resolveTopic(slug);
  if (!topic) return null;

  return (
    <section aria-label="Algorithm library">
      <div className="flex items-center justify-between border-b border-subtle-line pb-3 tracking-wider select-none">
        <span className="text-xs font-bold uppercase tracking-widest text-faint">
          SYS // ALGORITHM_LIBRARY
        </span>
        <span className="border border-accent-primary/20 bg-accent-primary/5 px-2 py-0.5 font-mono text-[10px] text-accent-primary/80">
          {topic.algorithms.length} ALGORITHMS
        </span>
      </div>

      {/* In-page jump navigation — one anchor per algorithm card below. */}
      <nav aria-label="Jump to algorithm" className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-[10px] uppercase tracking-[0.22em] text-accent-primary">Jump to algorithm</span>
        <span className="flex flex-wrap gap-2">
          {topic.algorithms.map((entry, i) => (
            <Fragment key={entry.id}>
              <a
                href={`#alg-${entry.id}`}
                className="border border-subtle-line px-2.5 py-1.5 text-[9px] font-mono uppercase tracking-widest text-fg transition-colors hover:border-accent-primary/50 hover:text-accent-primary"
              >
                {String(i + 1).padStart(2, "0")} · {entry.name}
              </a>
            </Fragment>
          ))}
        </span>
      </nav>

      <div className="mt-4 space-y-4">
        {topic.algorithms.map((entry, i) => (
          <AlgorithmCard key={entry.id} entry={entry} index={i} />
        ))}
      </div>
    </section>
  );
}
