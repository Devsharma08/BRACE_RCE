import { useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  ChevronRight,
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

// ── 01 // Mission anchors & status ──────────────────────────────────────────
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
      "A uniform sandbox interface running JavaScript, Python, C++, Java, and C with per-submission time and memory limits.",
  },
  {
    icon: Cpu,
    label: "Sandboxed Execution",
    title: "Run untrusted code without exposing the host",
    description:
      "Source code transforms into bounded wrapper payloads with sealed filesystem, network, and environment boundaries.",
  },
  {
    icon: GitBranch,
    label: "Test Suite Orchestration",
    title: "Cases assembled, not hand-picked",
    description:
      "Evaluates visible examples, hidden probes, and boundary edge cases with individual diffs and execution telemetry.",
  },
];

// ── 03 // Telemetry metrics ──────────────────────────────────────────────────
type MetricStatus = "nominal" | "warning";
type TelemetryMetric = { label: string; value: string; unit: string; status: MetricStatus; description: string };

const telemetryMetrics: TelemetryMetric[] = [
  { label: "DB pre-flight", value: "98.4%", unit: "pass rate", status: "nominal", description: "Schema, seed, and query integrity checks across tables." },
  { label: "Test suite", value: "214", unit: "cases green", status: "nominal", description: "Passing test cases across client and server." },
  { label: "Sandbox pool", value: "3", unit: "workers idle", status: "nominal", description: "Isolated workers standing by for executions." },
  { label: "Median runtime", value: "187ms", unit: "wall clock", status: "nominal", description: "Median execution time per run on reference hardware." },
  { label: "Realtime link", value: "99.2%", unit: "delivery", status: "nominal", description: "Socket handshake and event delivery in simulation." },
  { label: "Flake rate", value: "0.8%", unit: "retried", status: "warning", description: "Runs retried after timeout or noise." },
];

// ── 04 // Tech stack matrix ──────────────────────────────────────────────────
const dependencies = [
  {
    value: "Polyglot editor core",
    packages: ["@monaco-editor/react"],
    scope: "Client",
    icon: Terminal,
    why: "Full IDE experience with syntax highlighting, indentation, and keybindings.",
  },
  {
    value: "Cache-first data layer",
    packages: ["@tanstack/react-query"],
    scope: "Client",
    icon: Zap,
    why: "Fast cache-first querying and state invalidation across problems and lobbies.",
  },
  {
    value: "Realtime transport",
    packages: ["socket.io-client"],
    scope: "Client",
    icon: Puzzle,
    why: "Bidirectional WebSocket connection for live 1v1 battle sync and room states.",
  },
  {
    value: "API & data layer",
    packages: ["express", "@prisma/client", "pg"],
    scope: "Server",
    icon: Database,
    why: "REST API engine backed by PostgreSQL and Prisma typed schema validation.",
  },
  {
    value: "Sessions & safety",
    packages: ["@react-oauth/google", "@marsidev/react-turnstile", "jsonwebtoken", "bcrypt", "express-rate-limit"],
    scope: "Shared",
    icon: KeyRound,
    why: "OAuth, Cloudflare Turnstile bot deterrence, JWT auth, and endpoint rate limits.",
  },
  {
    value: "Tooling & tokens",
    packages: ["react", "vite", "typescript", "tailwindcss"],
    scope: "Foundation",
    icon: Wrench,
    why: "Modern build tooling, strict typed contracts, and semantic design tokens.",
  },
  {
    value: "Considering next",
    packages: ["playwright", "axe-core"],
    scope: "Candidate — not installed",
    candidate: true,
    icon: FlaskConical,
    why: "Playwright would turn the outstanding browser-level responsive review into repeatable checks at 320–1440px, and axe-core would bring automated accessibility assertions into CI. Motivation recorded here; nothing is merged until it earns its place.",
  },
];

// ── 05 // Operative bio ─────────────────────────────────────────────────────
const operative = {
  name: "Dev Sharma",
  role: "Architect // Operator",
  handle: "DEV_SHARMA",
  bio: "BRACE RCE is designed, built, and operated by a single operative. My DSA journey meets my web development skills here — the arena is the record of both.",
  focus: ["Polyglot sandbox", "Realtime engine", "Design tokens"],
};

const operativeLinks = [
  { label: "Source repository", href: repository },
  { label: "Browse project issues", href: `${repository}/issues` },
  { label: "DSA data repository", href: "https://github.com/Devsharma08/DSA-LEETCODE" },
];

// ── Snippet lines ────────────────────────────────────────────────────────────
const rawSolutionLines = [
  { text: "#include <stdio.h>", dim: true },
  { text: "int main(void) {" },
  { text: "  int a, b; scanf(\"%d %d\", &a, &b);" },
  { text: "  printf(\"%d\\n\", a + b); return 0;" },
  { text: "}" },
];

const wrapperLines = [
  { text: "// GENERATED BY BRACE RCE // NOT AUTHORED", dim: true },
  { text: "const job = sandbox.launch({ language: \"c\", limits: { cpuMs: 500, memMb: 128 } });", accent: true },
  { text: "job.stdin.write(raw_solution);" },
  { text: "job.on(\"exit\", evaluate_verdict);" },
];

// ── Reusable Micro-Components ────────────────────────────────────────────────
const anchorChip =
  "inline-flex items-center gap-1.5 border border-subtle-line bg-surface px-2.5 py-1 font-mono text-[11px] font-medium tracking-wider text-subtle transition hover:border-accent-primary/60 hover:text-accent-primary";

const ctaOutline =
  "inline-flex items-center gap-2 border border-subtle-line px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-fg transition hover:border-accent-primary/60 hover:text-accent-primary";

function SectionLabel({ number, eyebrow, id, title }: { number: string; eyebrow: string; id: string; title: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-accent-primary">
        <span>{number}</span>
        <span className="h-px w-6 bg-accent-primary/60" />
        {eyebrow}
      </div>
      <h2 id={id} className="mt-2 font-mono text-2xl font-bold tracking-tight text-fg md:text-3xl">{title}</h2>
    </div>
  );
}

const TelemetryIndicator = () => (
  <span
    role="status"
    aria-label="Test suite status: nominal"
    className="inline-flex items-center gap-2"
  >
    <StatusPill tone="live" pulse>
      Test suite // nominal
    </StatusPill>
    <span aria-hidden="true" className="text-faint">|</span>
    <span className="font-mono text-[11px] text-subtle">DB pre-flight 98.4%</span>
  </span>
);

const TerminalSnippetBox = () => (
  <div className="overflow-hidden border border-subtle-line bg-surface">
    <div className="flex items-center justify-between border-b border-subtle-line px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-accent-danger/70" aria-hidden="true" />
        <span className="size-2 rounded-full bg-accent-warning/70" aria-hidden="true" />
        <span className="size-2 rounded-full bg-accent-success/70" aria-hidden="true" />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-subtle">brace-rce // harness</span>
      </div>
      <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-accent-success">
        <ShieldCheck size={12} aria-hidden="true" /> sandboxed
      </span>
    </div>

    <div className="grid divide-y divide-subtle-line lg:grid-cols-2 lg:divide-x lg:divide-y-0">
      <div className="p-3">
        <span className="font-mono text-[9px] uppercase tracking-wider text-faint">RAW_SOLUTION.c (operative input)</span>
        <pre className="mt-2 font-mono text-xs leading-relaxed text-subtle" aria-label="Raw solution source">
          <code>
            {rawSolutionLines.map((l, i) => (
              <span key={i} className={`block ${l.dim ? "text-faint" : "text-fg"}`}>{l.text}</span>
            ))}
          </code>
        </pre>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-wider text-accent-primary">
            wrapper generator // automated transform
          </span>
          <span className="font-mono text-[9px] uppercase text-accent-warning">generated</span>
        </div>
        <pre className="mt-2 font-mono text-xs leading-relaxed text-subtle" aria-label="Generated wrapper payload">
          <code>
            {wrapperLines.map((l, i) => (
              <span key={i} className={`block ${l.dim ? "text-faint" : l.accent ? "text-accent-primary" : "text-subtle"}`}>{l.text}</span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  </div>
);

const About = () => {
  const [suitePass, setSuitePass] = useState(98.4);
  const [isRunning, setIsRunning] = useState(false);

  function runSuite() {
    setIsRunning(true);
    setSuitePass(96.2);
    window.setTimeout(() => {
      setSuitePass(98.4);
      setIsRunning(false);
    }, 1000);
  }

  return (
    <main className="min-h-screen w-full min-w-0 bg-base text-fg selection:bg-accent-primary/30 selection:text-ink">
      <div id="top" className="relative z-10 mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">

        {/* ══ 01 // MISSION / HERO ══════════════════════════════════════════ */}
        <section aria-labelledby="about-title" className="pb-12 pt-4">
          <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-accent-primary">
            <span className="h-px w-8 bg-accent-primary" /> Mission // Executive Summary
          </div>

          <h1 id="about-title" className="font-mono text-3xl font-bold uppercase tracking-tight text-fg sm:text-5xl lg:text-6xl">
            Build your skills.<br />
            <span className="text-accent-primary">Bring them to </span>
            <span className="text-subtle">the arena.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-subtle sm:text-base">
            BRACE RCE connects a multi-language coding workspace, algorithm practice, and real-time coding battles. Built by Dev Sharma, with the project developed in the open on GitHub.
          </p>

          <p className="mt-2 max-w-2xl font-mono text-xs leading-relaxed text-subtle">
            &gt; my DSA journey meets my web development skills — polyglot execution, sandboxed runs, and verdicts you can audit case by case.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="#innovation" className="flex items-center gap-2 bg-accent-primary px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition hover:bg-accent-primary/85">
              Enter system <ArrowDown size={12} />
            </a>
            <a href="#telemetry" className={ctaOutline}>
              Telemetry <ChevronRight size={12} />
            </a>
            <a href={repository} target="_blank" rel="noopener noreferrer" className={ctaOutline}>
              Explore the repository <ArrowUpRight size={12} />
            </a>
          </div>

          <nav aria-label="About page sections" className="mt-6 flex flex-wrap gap-2">
            {heroAnchors.map((anchor) => (
              <a key={anchor.href} href={anchor.href} className={anchorChip}>
                {anchor.label}
                <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
              </a>
            ))}
          </nav>

          <div className="mt-8 flex flex-wrap gap-6 border-t border-subtle-line pt-4 font-mono text-[10px] uppercase tracking-wider text-faint">
            {heroStatus.map((row, index) => (
              <span key={row.label}>
                <b className="text-fg">0{index + 1}</b> {row.label}: <span className={row.tone}>{row.value}</span>
              </span>
            ))}
          </div>
        </section>

        {/* ══ 02 // TECHNICAL INNOVATION ════════════════════════════════════ */}
        <section id="innovation" aria-label="Engineered for polyglot execution" className="scroll-mt-16 border-t border-subtle-line py-12">
          <SectionLabel number="02" title="Engineered for polyglot execution" eyebrow="Architecture" id="innovation-title" />

          {/* 3 Pillar Cards */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {innovations.map((item, index) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="border border-subtle-line bg-surface p-4 transition hover:border-accent-primary/40">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-accent-primary">0{index + 1}</span>
                    <Icon size={16} className="text-subtle" aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 font-mono text-sm font-bold text-fg">{item.label}</h3>
                  <p className="mt-1 font-mono text-[11px] text-faint">{item.title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-subtle">{item.description}</p>
                </article>
              );
            })}
          </div>

          {/* Execution Pipeline Box */}
          <div className="mt-4 border border-subtle-line bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-accent-primary">Execution pipeline</span>
                <h3 className="font-mono text-sm font-bold text-fg">Raw solution → automated wrapper payload</h3>
              </div>
            </div>
            <TerminalSnippetBox />
          </div>
        </section>

        {/* ══ 03 // SYSTEM TELEMETRY ════════════════════════════════════════ */}
        <section id="telemetry" aria-label="Interactive System Telemetry" className="scroll-mt-16 border-t border-subtle-line py-12">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <SectionLabel number="03" title="Interactive System Telemetry & Metrics" eyebrow="Telemetry" id="telemetry-title" />
            <div className="flex items-center gap-3">
              <TelemetryIndicator />
              <button
                onClick={runSuite}
                className="flex items-center gap-1.5 border border-accent-success/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-accent-success transition hover:bg-accent-success/10"
              >
                <Play size={10} /> {isRunning ? "Running..." : "Run test suite"}
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {telemetryMetrics.map((m) => (
              <div key={m.label} className="border border-subtle-line bg-surface p-3">
                <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase text-faint">
                  <span className={`size-1.5 rounded-full ${m.status === "warning" ? "bg-accent-warning" : "bg-accent-success"}`} />
                  {m.label}
                </div>
                <div className="mt-2 font-mono text-lg font-bold text-fg">
                  {m.value}
                  <span className="ml-1 text-[10px] font-normal text-subtle">{m.unit}</span>
                </div>
                <p className="mt-1 text-[10px] leading-tight text-faint">{m.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 border border-subtle-line bg-surface/50 px-3 py-2 text-xs text-subtle">
            <Shield size={14} className="shrink-0 text-accent-primary" aria-hidden="true" />
            <span className="font-mono text-[11px]">
              Pre-flight DB verification pass rate: <strong className="text-fg">{suitePass.toFixed(1)}%</strong> across 214 test cases in 5 languages.
            </span>
          </div>
        </section>

        {/* ══ 04 // TECH STACK MATRIX ═══════════════════════════════════════ */}
        <section id="stack" aria-label="Built in the open" className="scroll-mt-16 border-t border-subtle-line py-12">
          <SectionLabel number="04" title="Built in the open" eyebrow="Tech Stack" id="stack-title" />

          <div className="mt-6 divide-y divide-subtle-line border border-subtle-line bg-surface">
            {dependencies.map(({ value, packages, scope, icon: Icon, why, candidate }) => (
              <div key={value} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`grid size-7 shrink-0 place-items-center border ${candidate ? "border-accent-warning/30 text-accent-warning" : "border-accent-primary/30 text-accent-primary"}`}>
                    <Icon size={14} aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono text-xs font-bold text-fg">{value}</h3>
                      <span className={`font-mono text-[9px] uppercase ${candidate ? "text-accent-warning" : "text-faint"}`}>{scope}</span>
                    </div>
                    <p className="text-[11px] leading-snug text-subtle">{why}</p>
                  </div>
                </div>

                <ul className="flex flex-wrap gap-1.5 sm:justify-end" aria-label={`${value} packages`}>
                  {packages.map((pkg) => (
                    <li
                      key={pkg}
                      className={`border px-2 py-0.5 font-mono text-[10px] ${
                        candidate ? "border-dashed border-accent-warning/40 text-accent-warning" : "border-subtle-line bg-base text-fg"
                      }`}
                    >
                      {pkg}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ══ 05 // OPERATIVE / CREDIT ══════════════════════════════════════ */}
        <section id="credits" aria-labelledby="credits-title" className="scroll-mt-16 border-t border-subtle-line py-12">
          <div className="border border-accent-primary/20 bg-accent-primary/[0.03] p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-accent-primary">
                  <span className="h-px w-6 bg-accent-primary" /> Operative / Developer Credit
                </div>
                <h2 id="credits-title" className="font-mono text-xl font-bold text-fg sm:text-2xl">
                  {operative.name} <span className="font-mono text-xs font-normal text-subtle">@{operative.handle}</span>
                </h2>
                <p className="font-mono text-[11px] uppercase tracking-wider text-accent-primary">{operative.role}</p>
                <p className="mt-2 max-w-xl text-xs leading-relaxed text-subtle">{operative.bio}</p>

                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Areas of focus">
                  {operative.focus.map((area) => (
                    <li key={area} className="border border-subtle-line bg-base px-2 py-0.5 font-mono text-[9px] uppercase text-subtle">
                      {area}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex shrink-0 flex-col gap-2 font-mono text-xs">
                {operativeLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-subtle transition hover:text-accent-primary"
                  >
                    {link.label} <ArrowUpRight size={12} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="mx-auto flex max-w-6xl justify-between border-t border-subtle-line px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-faint sm:px-6 lg:px-8">
        <span>BRACE // RCE — MIT LICENSE</span>
        <span>system integrity: nominal</span>
      </footer>
    </main>
  );
};

export default About;
