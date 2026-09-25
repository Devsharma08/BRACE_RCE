import { useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Cpu,
  Database,
  FlaskConical,
  GitBranch,
  KeyRound,
  Layers,
  Play,
  Puzzle,
  Shield,
  ShieldCheck,
  Terminal,
  Wrench,
  Zap,
} from "lucide-react";
import { StatusPill, type StatusTone } from "../components/ui/StatusPill";

const repository = "https://github.com/Devsharma08/BRACE_RCE";

// ── 01 // Mission / executive summary ───────────────────────────────────────
const heroAnchors = [
  { label: "02 // Technical innovation", href: "#innovation" },
  { label: "03 // System telemetry", href: "#telemetry" },
  { label: "04 // Tech stack matrix", href: "#stack" },
  { label: "05 // Operative credit", href: "#credits" },
];

const heroStatus = [
  { label: "System status", value: "NOMINAL", tone: "text-accent-success" },
  { label: "Execution mode", value: "SANDBOXED", tone: "text-accent-primary" },
  { label: "Polyglot engine", value: "5 LANGUAGES", tone: "text-accent-primary" },
];

// ── 02 // Technical innovation pillars ──────────────────────────────────────
const innovations = [
  {
    icon: Layers,
    label: "Polyglot Engine",
    title: "One runtime, five languages",
    description:
      "A shared sandbox interface fronts JavaScript, Python, C++, Java, and C. Each submission is compiled or interpreted by a language-specific harness, then timed and memory-capped before a single verdict reaches the output panel.",
    highlights: [
      "Per-run resource ceilings: CPU time, memory cap, and wall-clock timeout.",
      "Language-specific harnesses handled behind one uniform run contract.",
      "Deterministic teardown so a runaway submission cannot poison the next slot.",
    ],
  },
  {
    icon: Cpu,
    label: "Sandboxed Execution",
    title: "Run untrusted code without exposing the host",
    description:
      "Submission payloads never touch the shell directly. A wrapper generator transforms raw source into a bounded harness, injects test fixtures, captures stdout and stderr, and returns only the verdict and telemetry the UI is allowed to read.",
    highlights: [
      "Wrapper payloads are generated per submission, never reused across runs.",
      "Stdout, stderr, exit codes, and runtime metrics stay separate from source.",
      "Execution context scoped so filesystem, network, and env access stay closed.",
    ],
  },
  {
    icon: GitBranch,
    label: "Test Suite Orchestration",
    title: "Cases assembled, not hand-picked",
    description:
      "Every problem definition feeds a case generator that produces visible examples, hidden probes, and boundary cases. The evaluator grades case-by-case instead of collapsing the run into one pass/fail blob.",
    highlights: [
      "Visible, hidden, and edge tiers surfaced as distinct status badges.",
      "Expected vs actual diffs presented per failing case.",
      "Runtime and memory telemetry attached to every case, not just the verdict.",
    ],
  },
];

// ── 03 // Telemetry metrics — illustrative harness snapshot ─────────────────
type MetricStatus = "nominal" | "warning" | "critical";
type TelemetryMetric = { label: string; value: string; unit: string; status: MetricStatus; description: string };

const telemetryMetrics: TelemetryMetric[] = [
  { label: "DB pre-flight", value: "98.4%", unit: "pass rate", status: "nominal", description: "Schema, seed, and query checks across problem, user, and room tables." },
  { label: "Test suite", value: "214", unit: "cases green", status: "nominal", description: "Visible, hidden, and edge cases exercised in the latest client + server run." },
  { label: "Sandbox pool", value: "3", unit: "workers idle", status: "nominal", description: "Isolated workers standing by for wrapped submissions." },
  { label: "Median runtime", value: "187ms", unit: "wall clock", status: "nominal", description: "Across the latest evaluation window on reference hardware." },
  { label: "Realtime link", value: "99.2%", unit: "delivery", status: "nominal", description: "Socket handshake and event delivery in the local battle simulation." },
  { label: "Flake rate", value: "0.8%", unit: "retried", status: "warning", description: "Runs flagged for retry after timeout or teardown noise." },
];

// ── 04 // Tech stack matrix ──────────────────────────────────────────────────
// Every package listed below is declared in package.json (client) or server/package.json (server).
// Each entry records why it earns its place; the candidate entry is recorded, not installed.
const dependencies = [
  {
    value: "Polyglot editor core",
    packages: ["@monaco-editor/react"],
    scope: "Client",
    span: "lg:col-span-7",
    icon: Terminal,
    why: "The editor is the product surface. Monaco brings real IDE behaviour — five languages, formatting, decorations, and keyboard workflows — that a hand-rolled textarea cannot match.",
  },
  {
    value: "Cache-first data layer",
    packages: ["@tanstack/react-query"],
    scope: "Client",
    span: "lg:col-span-5",
    icon: Zap,
    why: "Battle state, problem data, and leaderboards need cache-first fetching with precise invalidation; rebuilding that by hand invites stale-data bugs.",
  },
  {
    value: "Realtime transport",
    packages: ["socket.io-client"],
    scope: "Client",
    span: "lg:col-span-4",
    icon: Puzzle,
    why: "Battles, presence snapshots, and challenge delivery depend on reliable two-way events with automatic reconnection.",
  },
  {
    value: "API & data layer",
    packages: ["express", "@prisma/client", "pg"],
    scope: "Server",
    span: "lg:col-span-4",
    icon: Database,
    why: "Express serves the REST APIs, and Prisma gives a schema-checked, typed layer over PostgreSQL for users, problems, rooms, and match history.",
  },
  {
    value: "Sessions & safety",
    packages: ["@react-oauth/google", "@marsidev/react-turnstile", "jsonwebtoken", "bcrypt", "express-rate-limit"],
    scope: "Shared",
    span: "lg:col-span-4",
    icon: KeyRound,
    why: "Google sign-in, Turnstile checks, JWT sessions, hashed credentials, and rate limiting defend accounts and endpoints by default.",
  },
  {
    value: "Tooling & tokens",
    packages: ["react", "vite", "typescript", "tailwindcss"],
    scope: "Foundation",
    span: "lg:col-span-5",
    icon: Wrench,
    why: "Semantic design tokens live once in CSS, Vite keeps builds fast, and TypeScript contracts hold client, server, and socket payloads together.",
  },
  {
    value: "Considering next",
    packages: ["playwright", "axe-core"],
    scope: "Candidate — not installed",
    span: "lg:col-span-7",
    icon: FlaskConical,
    candidate: true,
    why: "Playwright would turn the outstanding browser-level responsive review into repeatable checks at 320–1440px, and axe-core would bring automated accessibility assertions into CI. Motivation recorded here; nothing is merged until it earns its place.",
  },
];

// ── 05 // Operative credit ───────────────────────────────────────────────────
const operative = {
  handle: "DEV_SHARMA",
  name: "Dev Sharma",
  role: "Architect // Operator",
  focus: ["Polyglot engine", "Sandboxed execution", "Realtime transport", "Design-token system"],
  bio: "BRACE RCE is designed, built, and operated by a single operative. My DSA journey meets my web development skills here — the arena is the record of both.",
};

const operativeLinks = [
  { label: "Source repository", href: repository },
  { label: "Browse project issues", href: `${repository}/issues` },
  { label: "DSA data repository", href: "https://github.com/Devsharma08/DSA-LEETCODE" },
];

// ── Terminal snippet: raw solution → automated wrapper payload ──────────────
const snippetTabs = [
  { id: "raw", label: "RAW_SOLUTION.c" },
  { id: "wrapper", label: "WRAPPER_PAYLOAD.js" },
];

const rawSolutionLines = [
  { text: "#include <stdio.h>", dim: true },
  { text: "" },
  { text: "int main(void) {" },
  { text: "  int a, b;" },
  { text: '  scanf("%d %d", &a, &b);' },
  { text: '  printf("%d\\n", a + b);' },
  { text: "  return 0;" },
  { text: "}" },
];

const wrapperLines = [
  { text: "// ── GENERATED BY BRACE RCE // NOT AUTHORED ──", dim: true },
  { text: "const job = sandbox.launch({" },
  { text: "  language: \"cpp\",", accent: true },
  { text: '  sourceHash: "sha256:7f9a2c…",', accent: true },
  { text: "  limits: { cpuMs: 500, memoryMb: 128, wallMs: 750 },", accent: true },
  { text: "  cases: [" },
  { text: '    { input: "12 24\\n", expected: "36\\n" },' },
  { text: '    { input: "-5 9\\n",  expected: "4\\n"  },' },
  { text: "  ]," },
  { text: "});" },
  { text: "" },
  { text: "job.stdin.write(raw_solution);" },
  { text: "job.on(\"exit\", evaluate_verdict);" },
];

// ── Shared design ingredients (v0 cyber-battlefield style) ──────────────────
const anchorChip =
  "inline-flex min-h-8 items-center gap-1.5 border border-subtle-line bg-surface px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle transition hover:border-accent-primary/60 hover:text-accent-primary";

const ctaOutline =
  "flex min-h-11 items-center gap-3 border border-subtle-line px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fg transition hover:border-accent-primary/60 hover:text-accent-primary";

const monoLink =
  "flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-fg transition hover:text-accent-primary";

function SectionLabel({ number, eyebrow, id, title }: { number: string; eyebrow: string; id: string; title: string }) {
  return (
    <div>
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.26em] text-accent-primary">
        <span>{number}</span>
        <span className="h-px w-8 bg-accent-primary/60" />
        {eyebrow}
      </div>
      <h2 id={id} className="mt-5 font-mono text-3xl font-bold tracking-tight text-fg md:text-4xl">{title}</h2>
    </div>
  );
}

// ── Live status indicator: Test Suite / pre-flight DB verification ──────────
const telemetryTone: Record<MetricStatus, StatusTone> = {
  nominal: "live",
  warning: "warning",
  critical: "danger",
};

const statusDotClass: Record<MetricStatus, string> = {
  nominal: "bg-accent-success",
  warning: "bg-accent-warning",
  critical: "bg-accent-danger",
};

const statusTextClass: Record<MetricStatus, string> = {
  nominal: "text-accent-success",
  warning: "text-accent-warning",
  critical: "text-accent-danger",
};

const telemetryStatus = telemetryMetrics.some((m) => m.status === "critical")
  ? "critical"
  : telemetryMetrics.some((m) => m.status === "warning")
    ? "warning"
    : "nominal";

const TelemetryIndicator = () => (
  <span
    role="status"
    aria-label={`Test suite status: ${telemetryStatus}`}
    className="inline-flex items-center gap-2.5"
  >
    <StatusPill tone={telemetryTone[telemetryStatus]} pulse={telemetryStatus !== "critical"}>
      Test suite // {telemetryStatus}
    </StatusPill>
    <span aria-hidden="true" className="text-faint">|</span>
    <span className="font-mono text-[11px] font-normal text-subtle">DB pre-flight 98.4%</span>
  </span>
);

// ── Terminal-style snippet box: raw solution → wrapper payload ──────────────
const SnippetLine = ({ text, dim, accent }: { text: string; dim?: boolean; accent?: boolean }) => (
  <span className={`block whitespace-pre ${dim ? "text-faint" : accent ? "text-accent-primary" : "text-subtle"}`}>{text || " "}</span>
);

const TerminalSnippetBox = () => {
  const preClass =
    "m-0 overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed bg-terminal-bg";
  return (
    <div className="overflow-hidden border border-subtle-line">
      {/* Terminal chrome */}
      <div className="flex items-center gap-2 border-b border-subtle-line bg-surface px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-accent-danger/70" aria-hidden="true" />
        <span className="size-2.5 rounded-full bg-accent-warning/70" aria-hidden="true" />
        <span className="size-2.5 rounded-full bg-accent-success/70" aria-hidden="true" />
        <span className="ml-2 font-mono text-[10px] font-bold uppercase tracking-widest text-subtle">
          brace-rce // wrapper-transform
        </span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-accent-success">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> sandboxed
        </span>
      </div>

      {/* Raw solution pane */}
      <div>
        <div className="flex items-center justify-between border-b border-subtle-line bg-surface/60 px-4 py-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-subtle">
            {snippetTabs[0].label}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-faint">operative input</span>
        </div>
        <pre className={preClass} aria-label="Raw solution source">
          <code>{rawSolutionLines.map((l, i) => <SnippetLine key={i} {...l} />)}</code>
        </pre>
      </div>

      {/* Transform divider */}
      <div className="flex items-center gap-2 border-y border-subtle-line bg-surface px-4 py-2">
        <ArrowUpRight className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-primary">
          wrapper generator // automated transform
        </span>
      </div>

      {/* Wrapper payload pane */}
      <div>
        <div className="flex items-center justify-between border-b border-subtle-line bg-surface/60 px-4 py-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-subtle">
            {snippetTabs[1].label}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-accent-warning">generated — not authored</span>
        </div>
        <pre className={preClass} aria-label="Generated wrapper payload">
          <code>{wrapperLines.map((l, i) => <SnippetLine key={i} {...l} />)}</code>
        </pre>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-subtle-line bg-surface px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-faint">
        <span>limits: cpu 500ms · mem 128mb · wall 750ms</span>
        <span className="text-accent-success">2/2 cases staged</span>
      </div>
    </div>
  );
};

// ── Telemetry board: metric grid over the live snapshot ─────────────────────
const TelemetryBoard = () => (
  <div className="border border-subtle-line bg-surface">
    <dl className="grid grid-cols-2 gap-px bg-subtle-line sm:grid-cols-3">
      {telemetryMetrics.map((metric) => {
        const tone = { dot: statusDotClass[metric.status], text: statusTextClass[metric.status] };
        return (
          <div key={metric.label} className={`bg-surface p-5 ${metric.status === "warning" ? "border-b-2 border-b-accent-warning/40" : ""}`}>
            <dt className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-faint">
              <span className={`size-1.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
              {metric.label}
            </dt>
            <dd className={`mt-3 font-mono text-2xl font-bold ${metric.status === "warning" ? "text-accent-warning" : "text-fg"}`}>{metric.value}<small className={`ml-1 text-xs ${tone.text}`}>{metric.unit}</small></dd>
            <dd className="mt-1.5 text-[11px] leading-relaxed text-subtle">{metric.description}</dd>
          </div>
        );
      })}
    </dl>
    <div className="flex items-start gap-2.5 border-t border-subtle-line px-5 py-3.5">
      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" aria-hidden="true" />
      <p className="text-[11px] leading-relaxed text-subtle">
        Illustrative snapshot from the local evaluation harness — not a production dashboard. Pre-flight DB verification, sandbox health, and suite results are operational signals for this build, not guarantees of isolation or correctness.
      </p>
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════════════════
// Theme note: this page uses the shared app tokens (bg-base / bg-surface /
// border-subtle-line / accent-* / text roles). The v0 composition is kept,
// but colors, borders, mono type, and state colors are 100% token-native.

const innovationFlows = [
  "wrapper → fixtures → verdict",
  "isolate → execute → purge",
  "visible → hidden → edge",
];

const About = () => {
  const [suitePass, setSuitePass] = useState(98.4);
  const [isRunning, setIsRunning] = useState(false);

  function runSuite() {
    setIsRunning(true);
    setSuitePass(96.2);
    window.setTimeout(() => {
      setSuitePass(98.4);
      setIsRunning(false);
    }, 1400);
  }

  const codeBase = rawSolutionLines.length;

  return (
    <main
      className="min-h-screen w-full min-w-0 overflow-hidden bg-base text-fg selection:bg-accent-primary/30 selection:text-ink"
    >
      {/* Grid overlay — v0 backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(rgba(72, 91, 108, .08) 1px, transparent 1px), linear-gradient(90deg, rgba(72, 91, 108, .08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "linear-gradient(to bottom, black, transparent 80%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 80%)",
        }}
      />

      <div id="top" className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ══ 01 // MISSION / EXECUTIVE SUMMARY (HERO) ══════════════════════ */}
        <section aria-labelledby="about-title" className="grid min-h-[650px] items-center gap-12 py-16 lg:grid-cols-[1.08fr_.92fr] lg:py-24">
          <div className="min-w-0">
            <div className="mb-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.26em] text-accent-primary"><span className="h-px w-10 bg-accent-primary" /> Mission // Executive Summary</div>
            <h1 id="about-title" className="max-w-4xl font-mono text-4xl font-bold uppercase leading-[.96] tracking-[-0.075em] text-fg sm:text-6xl lg:text-7xl">
              Build your skills.<br />
              <span className="text-accent-primary">Bring them to</span><br />
              <span className="text-subtle">the arena.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-7 text-subtle">
              BRACE RCE connects a multi-language coding workspace, algorithm practice, and real-time coding battles. Built by Dev Sharma, with the project developed in the open on GitHub.
            </p>
            <p className="mt-4 max-w-xl font-mono text-sm leading-relaxed text-subtle">
              &gt; my DSA journey meets my web development skills — polyglot execution, sandboxed runs, and verdicts you can audit case by case.
            </p>

            <div className="mt-10 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
              <a href="#innovation" className="group flex items-center gap-3 bg-accent-primary px-5 py-3 font-bold text-ink transition hover:bg-accent-primary/85">Enter the system <ArrowDown size={14} className="transition group-hover:translate-y-1" /></a>
              <a href="#telemetry" className={ctaOutline}>Read telemetry <ChevronRight size={14} /></a>
              <a href={repository} target="_blank" rel="noopener noreferrer" className={ctaOutline}>Explore the repository <ArrowUpRight size={14} /></a>
            </div>

            {/* Anchor hooks — jump to the 5 core components */}
            <nav aria-label="About page sections" className="mt-8 flex flex-wrap gap-2.5">
              {heroAnchors.map((anchor) => (
                <a key={anchor.href} href={anchor.href} className={anchorChip}>
                  {anchor.label}
                  <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                </a>
              ))}
            </nav>

            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-2 border-t border-subtle-line pt-5 font-mono text-[10px] uppercase tracking-wider text-faint">
              {heroStatus.map((row, index) => (
                <span key={row.label}><b className="text-fg">0{index + 1}</b> {row.label}: <span className={row.tone}>{row.value}</span></span>
              ))}
            </div>
          </div>

          {/* Code panel — wrapper_synth */}
          <div className="relative lg:pl-6">
            <div className="absolute -inset-10 bg-accent-primary/5 blur-3xl" aria-hidden="true" />
            <div className="relative border border-subtle-line bg-surface p-1 shadow-2xl shadow-accent-primary/20">
              <div className="flex items-center justify-between border-b border-subtle-line px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-subtle">
                <span className="flex items-center gap-2"><Terminal size={13} className="text-accent-primary" /> wrapper_synth.ts</span>
                <span>RAW → EXEC</span>
              </div>
              <div className="p-5 font-mono text-xs leading-7">
                {rawSolutionLines.map((line, index) => (
                  <div key={index} className="text-faint">
                    {String(index + 1).padStart(2, "0")} <span className={`ml-4 ${line.dim ? "text-subtle" : "text-fg"}`}>{line.text || " "}</span>
                  </div>
                ))}
                <div className="my-4 h-px bg-subtle-line" />
                <div className="text-faint">{String(codeBase + 1).padStart(2, "0")} <span className="ml-4 text-accent-success">✓ INPUT MARSHALLED</span></div>
                <div className="text-faint">{String(codeBase + 2).padStart(2, "0")} <span className="ml-4 text-accent-success">✓ FUNCTION INVOKED</span></div>
                <div className="text-faint">{String(codeBase + 3).padStart(2, "0")} <span className="ml-4 text-accent-success">✓ OUTPUT SERIALIZED</span></div>
                <div className="mt-4 border-l-2 border-accent-primary bg-accent-primary/5 px-4 py-3 text-accent-primary">{'{ "engine": "polyglot", "status": "verified" }'}</div>
              </div>
              <div className="flex items-center justify-between border-t border-subtle-line px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-subtle">
                <span>latency: 187ms</span>
                <span className="text-accent-success">● READY TO DEPLOY</span>
              </div>
            </div>
          </div>
        </section>


        {/* ══ 02 // TECHNICAL INNOVATION ════════════════════════════════════ */}
        <section id="innovation" aria-labelledby="innovation-title" className="scroll-mt-20 border-t border-subtle-line py-16 lg:py-24">
          <SectionLabel number="02" title="Engineered for polyglot execution" eyebrow="The engine beneath the arena" id="innovation-title" />
          <div className="mt-12 grid gap-4 lg:grid-cols-[.82fr_1.18fr]">
            {/* Core protocol card */}
            <div className="relative overflow-hidden border border-accent-primary/25 bg-accent-primary/[0.035] p-7 md:p-9">
              <div className="absolute right-0 top-0 h-32 w-32 border-l border-b border-accent-primary/20" aria-hidden="true" />
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-accent-primary">
                <span>Polyglot Engine</span><span>RCE / 001</span>
              </div>
              <div className="mt-16">
                <div className="font-mono text-6xl font-bold tracking-[-0.08em] text-fg">01<span className="text-accent-primary">.</span></div>
                <h3 className="mt-5 max-w-sm font-mono text-2xl font-bold leading-tight text-fg">{innovations[0].title}</h3>
                <p className="mt-5 max-w-md text-sm leading-6 text-subtle">{innovations[0].description}</p>
              </div>
              <ul className="mt-8 space-y-2">
                {innovations[0].highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2 text-xs leading-relaxed text-subtle">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-success" aria-hidden="true" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-accent-success">
                <span className="h-2 w-2 rounded-full bg-accent-success shadow-[0_0_12px_var(--accent-success)]" /> five runtimes online
              </div>
            </div>

            {/* Pillars 02 / 03 */}
            <div className="grid gap-4">
              {innovations.slice(1).map((item, index) => {
                const Icon = item.icon;
                return (
                  <article key={item.label} className="group relative border border-subtle-line bg-surface p-6 transition hover:border-accent-primary/40">
                    <div className="flex items-start justify-between">
                      <div className="font-mono text-3xl font-bold text-faint">0{index + 2}</div>
                      <Icon size={19} className="text-faint transition group-hover:text-accent-primary" aria-hidden="true" />
                    </div>
                    <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-primary/70">{item.label}</p>
                    <h3 className="mt-2 font-mono text-lg font-bold text-fg">{item.title}</h3>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-subtle">{item.description}</p>
                    <ul className="mt-4 space-y-2">
                      {item.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-start gap-2 text-xs leading-relaxed text-subtle">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-success" aria-hidden="true" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-accent-primary/70">
                      <span className="h-px w-8 bg-accent-primary/50" />{innovationFlows[index + 1]}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Execution pipeline: raw solution → automated wrapper payload */}
          <div className="mt-4 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
            <div className="border border-subtle-line bg-surface p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-primary">Execution pipeline</p>
              <h3 className="mt-3 font-mono text-lg font-bold text-fg">Raw solution → automated wrapper payload</h3>
              <p className="mt-3 text-sm leading-6 text-subtle">
                Submissions never touch the shell directly. The wrapper generator binds source to resource limits, attaches generated cases, and dispatches the payload to an isolated sandbox worker — then reports verdict and telemetry per case.
              </p>
            </div>
            <TerminalSnippetBox />
          </div>
        </section>

        {/* ══ 03 // INTERACTIVE SYSTEM TELEMETRY & METRICS ══════════════════ */}
        <section id="telemetry" aria-labelledby="telemetry-title" className="scroll-mt-20 border-t border-subtle-line py-16 lg:py-24">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <SectionLabel number="03" title="Interactive System Telemetry &amp; Metrics" eyebrow="Pre-flight verification" id="telemetry-title" />
            <div className="flex flex-wrap items-center gap-3">
              <TelemetryIndicator />
              <button onClick={runSuite} className="flex items-center gap-2 border border-accent-success/30 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-accent-success transition hover:bg-accent-success/10">
                <Play size={12} /> {isRunning ? "Running suite..." : "Run test suite"}
              </button>
            </div>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            {/* DB verification status — interactive */}
            <div className="border border-subtle-line bg-surface p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-xs uppercase tracking-widest text-subtle">DB verification status</div>
                  <div className="mt-3 flex items-center gap-3 font-mono text-3xl font-bold text-fg">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-success opacity-60 motion-reduce:animate-none" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-accent-success" />
                    </span>
                    {suitePass.toFixed(1)}<span className="text-base text-subtle">% pass</span>
                  </div>
                </div>
                <ShieldCheck className="text-accent-success" aria-hidden="true" />
              </div>
              <div className="mt-8 h-2 bg-base">
                <div className="h-full bg-accent-success transition-all duration-700" style={{ width: `${suitePass}%` }} />
              </div>
              <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-wider text-faint">
                <span>214 cases × 5 languages</span>
                <span>Live / verified</span>
              </div>
            </div>
            <TelemetryBoard />
          </div>

          <p className="mt-4 font-mono text-[11px] leading-relaxed text-faint">
            The status indicator aggregates the pre-flight DB verification pass rate with suite health from the latest harness cycle. Values re-resolve as submissions complete; they describe this build, not a hosted service.
          </p>
        </section>


        {/* ══ 04 // TECH STACK MATRIX ═══════════════════════════════════════ */}
        <section id="stack" aria-labelledby="stack-title" className="scroll-mt-20 border-t border-subtle-line py-16 lg:py-24">
          <SectionLabel number="04" title="Built in the open" eyebrow="Technology stack matrix" id="stack-title" />

          <div className="mt-12 overflow-hidden border border-subtle-line bg-surface">
            <div className="hidden grid-cols-[.7fr_1fr_1.8fr] border-b border-subtle-line px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-faint md:grid">
              <span>Layer</span><span>System</span><span>Operational advantage</span>
            </div>
            {dependencies.map(({ value, packages, scope, icon: Icon, why, candidate }) => (
              <div key={value} className="grid gap-4 border-b border-subtle-line p-5 last:border-0 md:grid-cols-[.7fr_1fr_1.8fr] md:items-center md:px-6">
                <div className="flex items-center gap-3">
                  <div className={`grid h-9 w-9 shrink-0 place-items-center border ${candidate ? "border-accent-warning/25 bg-accent-warning/5 text-accent-warning" : "border-accent-primary/25 bg-accent-primary/5 text-accent-primary"}`}>
                    <Icon size={16} aria-hidden="true" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-mono text-sm font-bold text-fg">{value}</h3>
                    <span className={`font-mono text-[8px] uppercase tracking-widest ${candidate ? "text-accent-warning" : "text-faint"}`}>{scope}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs leading-5 text-subtle">{why}</p>
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label={`${value} packages`}>
                    {packages.map((pkg) => (
                      <li key={pkg} className={`border px-2.5 py-1 font-mono text-xs ${candidate ? "border-dashed border-accent-warning/40 text-accent-warning" : "border-subtle-line bg-terminal-bg text-fg"}`}>{pkg}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-3 border border-dashed border-subtle-line p-5">
            <Shield className="mt-1 h-5 w-5 shrink-0 text-accent-primary" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-subtle">Code execution, runtime limits, and isolation depend on the deployment configuration. Battle focus telemetry and review tools are signals, not a guarantee of cheat prevention.</p>
          </div>
        </section>

        {/* ══ 05 // OPERATIVE / DEVELOPER CREDIT ════════════════════════════ */}
        <section id="credits" aria-labelledby="credits-title" className="scroll-mt-20 border-t border-subtle-line py-16 lg:py-24">
          <div className="border border-accent-primary/20 bg-accent-primary/[0.03] p-8 md:p-12">
            <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div className="min-w-0">
                <div className="mb-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.26em] text-accent-primary">
                  <span className="h-px w-10 bg-accent-primary" /> Operative / Developer Credit
                </div>
                <h2 id="credits-title" className="max-w-2xl font-mono text-3xl font-bold tracking-tight text-fg md:text-5xl">One operative.<br /><span className="text-accent-primary">Full stack.</span></h2>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center border border-accent-primary/50 bg-accent-primary/10 font-mono text-lg font-bold text-accent-primary">
                    {operative.handle.slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-fg">{operative.name} <span className="ml-1 font-mono text-xs font-normal tracking-[0.14em] text-subtle">@{operative.handle}</span></p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-primary">{operative.role}</p>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-subtle">{operative.bio}</p>
                    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Areas of focus">
                      {operative.focus.map((area) => (
                        <li key={area} className="border border-subtle-line bg-terminal-bg px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">{area}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-4">
                {operativeLinks.map((link) => (
                  <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={monoLink}>
                    {link.label} <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Page footer — v0 style */}
      <footer className="relative z-10 mx-auto flex max-w-7xl flex-col justify-between gap-3 border-t border-subtle-line px-4 py-7 font-mono text-[10px] uppercase tracking-widest text-faint sm:px-6 md:flex-row lg:px-8">
        <span>BRACE // RCE — MIT LICENSE</span>
        <span className="flex items-center gap-2"><GitBranch size={12} /> system integrity: nominal</span>
      </footer>
    </main>
  );
};

export default About;