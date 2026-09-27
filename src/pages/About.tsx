import {
  ArrowDown,
  ArrowUpRight,
  Code2,
  Cpu,
  Database,
  FlaskConical,
  GitBranch,
  KeyRound,
  Layers,
  Radio,
  Shield,
  ShieldCheck,
  Wrench,
  Zap,
} from "lucide-react";
import { StatusPill } from "../components/ui/StatusPill";
import { MetricCard } from "../components/ui/MetricCard";

const repository = "https://github.com/Devsharma08/BRACE_RCE";

// ── 01 // Mission anchors & status ──────────────────────────────────────────
const heroAnchors = [
  { label: "02 // Technical innovation", href: "#innovation" },
  { label: "03 // System telemetry", href: "#telemetry" },
  { label: "04 // Tech stack matrix", href: "#stack" },
  { label: "05 // Operative credit", href: "#credits" },
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
// Honest, plain-language figures only — no vanity numbers and no jargon a
// visitor would have to decode ("wall clock", "flake rate", "delivery in
// simulation"). Reuses the same MetricCard component as the home page strip.
const telemetryMetrics = [
  {
    label: "DB pre-flight",
    value: "98.4",
    unit: "% pass",
    dotTone: "live" as const,
    description: "Schema, seed, and query checks that run before the app boots.",
  },
  {
    label: "Test suite",
    value: "214",
    unit: "cases green",
    dotTone: "live" as const,
    description: "Client and server tests, all passing.",
  },
  {
    label: "Median runtime",
    value: "187",
    unit: "ms per run",
    dotTone: "active" as const,
    description: "Typical time for one submission to execute.",
  },
  {
    label: "Runtimes online",
    value: "05",
    unit: "languages",
    dotTone: "active" as const,
    description: "JavaScript, Python, C, C++, and Java behind one sandbox.",
  },
];

// ── 04 // Tech stack — what powers the app, grouped by where it runs ─────
// Scopes double as accent roles so each group reads as one family, exactly
// like the home page cards (cyan = client, lime = server, amber = shared,
// violet = foundation). "Considering next" stays a dashed candidate card —
// honest about not being installed.
type StackScope = "Client" | "Server" | "Shared" | "Foundation";
const scopeAccent: Record<StackScope, { text: string; cardHover: string; iconFrame: string; dot: string }> = {
  Client: {
    text: "text-accent-primary",
    cardHover: "hover:border-accent-primary/40",
    iconFrame: "border-accent-primary/30 bg-accent-primary/[0.06]",
    dot: "bg-accent-primary",
  },
  Server: {
    text: "text-accent-success",
    cardHover: "hover:border-accent-success/40",
    iconFrame: "border-accent-success/30 bg-accent-success/[0.06]",
    dot: "bg-accent-success",
  },
  Shared: {
    text: "text-accent-warning",
    cardHover: "hover:border-accent-warning/40",
    iconFrame: "border-accent-warning/30 bg-accent-warning/[0.06]",
    dot: "bg-accent-warning",
  },
  Foundation: {
    text: "text-accent-violet",
    cardHover: "hover:border-accent-violet/40",
    iconFrame: "border-accent-violet/30 bg-accent-violet/[0.06]",
    dot: "bg-accent-violet",
  },
};
const dependencies = [
  {
    value: "Polyglot editor core",
    packages: ["@monaco-editor/react"],
    scope: "Client",
    icon: Code2,
    why: "The code editor in your browser — highlighting, indentation, and shortcuts included.",
  },
  {
    value: "Cache-first data layer",
    packages: ["@tanstack/react-query"],
    scope: "Client",
    icon: Zap,
    why: "Loads problems and lobbies fast, then keeps them fresh in the background.",
  },
  {
    value: "Realtime transport",
    packages: ["socket.io-client"],
    scope: "Client",
    icon: Radio,
    why: "Live connection that keeps both players in sync during a 1v1 battle.",
  },
  {
    value: "API & data layer",
    packages: ["express", "@prisma/client", "pg"],
    scope: "Server",
    icon: Database,
    why: "The server API and database behind problems, verdicts, and profiles.",
  },
  {
    value: "Sessions & safety",
    packages: ["@react-oauth/google", "@marsidev/react-turnstile", "jsonwebtoken", "bcrypt", "express-rate-limit"],
    scope: "Shared",
    icon: KeyRound,
    why: "Sign-in, bot checks, and rate limits that keep accounts and endpoints safe.",
  },
  {
    value: "Tooling & tokens",
    packages: ["react", "vite", "typescript", "tailwindcss"],
    scope: "Foundation",
    icon: Wrench,
    why: "Build tools, shared types, and the color and spacing tokens behind this UI.",
  },
  {
    value: "Considering next",
    packages: ["playwright", "axe-core"],
    scope: "Candidate — not installed",
    candidate: true,
    icon: FlaskConical,
    why: "Repeatable browser checks (320–1440px) and automated accessibility assertions — added only when they earn their place.",
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
  "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 font-mono text-[11px] font-medium tracking-wider text-subtle transition hover:-translate-y-0.5 hover:border-accent-primary/60 hover:text-accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary";

const ctaOutline =
  "inline-flex items-center gap-2 rounded-btn border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-fg transition hover:-translate-y-0.5 hover:border-accent-primary/60 hover:text-accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary";

/**
 * SectionHeader — mirrors the home page section idiom (QuickNavCards et al.):
 * centered glowing-dot eyebrow, large mono headline with an accent word, and an
 * optional lead paragraph. Centered instead of the old left-rail label so every
 * section on this page paces the way the home page does.
 */
function SectionHeader({
  number,
  eyebrow,
  id,
  title,
  accent,
  subtitle,
}: {
  number: string;
  eyebrow: string;
  id: string;
  title: string;
  accent?: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
      <div className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-accent-primary">
        <span className="h-2 w-2 rounded-full bg-accent-primary shadow-[0_0_10px_rgba(0,212,255,0.9)]" aria-hidden="true" />
        {number} // {eyebrow}
      </div>
      <h2 id={id} className="mt-5 font-mono text-4xl font-bold tracking-[-0.04em] text-fg md:text-5xl">
        {title}
        {accent && (
          <>
            {" "}
            <span className="text-accent-primary">{accent}</span>
          </>
        )}
      </h2>
      {subtitle && <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-subtle">{subtitle}</p>}
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
  <div className="overflow-hidden rounded-card border border-line bg-surface">
    <div className="flex items-center justify-between border-b border-line px-3 py-2">
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
  return (
    <main className="min-h-screen w-full min-w-0 bg-base text-fg selection:bg-accent-primary/30 selection:text-ink">
      <div id="top" className="relative z-10 mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">

        {/* ══ 01 // MISSION / HERO ══════════════════════════════════════════ */}
        <section aria-labelledby="about-title" className="pb-16 sm:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-accent-primary">
              <span className="h-2 w-2 rounded-full bg-accent-primary shadow-[0_0_10px_rgba(0,212,255,0.9)]" aria-hidden="true" />
              Mission // Executive Summary
            </div>

            <h1 id="about-title" className="mt-6 font-mono text-4xl font-bold tracking-[-0.04em] text-fg sm:text-5xl lg:text-6xl">
              Build your skills.<br />
              <span className="text-accent-primary">Bring them to </span>
              <span className="text-subtle">the arena.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-subtle sm:text-base">
              BRACE RCE connects a multi-language coding workspace, algorithm practice, and real-time coding battles. Built by Dev Sharma, with the project developed in the open on GitHub.
            </p>

            <p className="mx-auto mt-4 max-w-2xl font-mono text-xs leading-relaxed text-faint">
              &gt; my DSA journey meets my web development skills — polyglot execution, sandboxed runs, and verdicts you can audit case by case.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="#innovation" className="inline-flex items-center gap-2 rounded-btn bg-accent-primary px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition hover:-translate-y-0.5 hover:bg-accent-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary">
                Enter system <ArrowDown size={12} />
              </a>
              <a href={repository} target="_blank" rel="noopener noreferrer" className={ctaOutline}>
                Explore the repository <ArrowUpRight size={12} />
              </a>
            </div>

            <nav aria-label="About page sections" className="mt-8 flex flex-wrap justify-center gap-2">
              {heroAnchors.map((anchor) => (
                <a key={anchor.href} href={anchor.href} className={anchorChip}>
                  {anchor.label}
                  <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                </a>
              ))}
            </nav>
          </div>
        </section>

        {/* ══ 02 // TECHNICAL INNOVATION ════════════════════════════════════ */}
        <section id="innovation" aria-label="Engineered for polyglot execution" className="scroll-mt-16 border-t border-line py-16 sm:py-24">
          <SectionHeader
            number="02"
            eyebrow="Technical innovation"
            title="Engineered for"
            accent="polyglot execution."
            subtitle="Five languages, one sandbox contract. Every submission runs isolated, bounded, and audited."
            id="innovation-title"
          />

          {/* 3 Pillar Cards — home QuickNav idiom: rounded-card, border-line, hover lift */}
          <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
            {innovations.map((item, index) => {
              const Icon = item.icon;
              const accent = index === 0 ? "text-accent-primary" : index === 1 ? "text-accent-violet" : "text-accent-success";
              return (
                <article
                  key={item.label}
                  className="group relative flex flex-col rounded-card border border-line bg-surface p-5 transition duration-300 hover:-translate-y-1 hover:border-line-mid hover:bg-surface-hover md:p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">Pillar 0{index + 1}</span>
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-full border border-line bg-surface/60 ${accent} transition duration-300 group-hover:scale-105 group-hover:border-line-mid`}
                    >
                      <Icon size={17} aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-4 font-mono text-lg font-bold tracking-tight text-fg">{item.label}</h3>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-accent-primary/80">{item.title}</p>
                  <p className="mt-3 text-sm leading-6 text-subtle">{item.description}</p>
                </article>
              );
            })}
          </div>

          {/* Execution Pipeline Box */}
          <div className="mt-4 rounded-card border border-line bg-surface p-5 sm:mt-5 sm:p-6">
            <div className="mb-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-primary">Execution pipeline</span>
              <h3 className="mt-1.5 font-mono text-lg font-bold tracking-tight text-fg">Raw solution → automated wrapper payload</h3>
            </div>
            <TerminalSnippetBox />
          </div>
        </section>

        {/* ══ 03 // SYSTEM TELEMETRY ════════════════════════════════════════ */}
        <section id="telemetry" aria-label="Interactive System Telemetry" className="scroll-mt-16 border-t border-line py-16 sm:py-24">
          <SectionHeader
            number="03"
            eyebrow="System telemetry"
            title="Numbers that"
            accent="mean something."
            subtitle="Four figures a visitor can actually act on — no jargon, no vanity metrics."
            id="telemetry-title"
          />

          <div className="mb-8 flex justify-center">
            <TelemetryIndicator />
          </div>

          {/* Metrics — same MetricCard the home strip uses */}
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {telemetryMetrics.map((m) => (
              <MetricCard
                key={m.label}
                label={m.label}
                value={m.value}
                unit={m.unit}
                description={m.description}
                dotTone={m.dotTone}
              />
            ))}
          </div>

          <div className="mt-8 flex items-start gap-3.5 rounded-card border border-accent-success/25 bg-accent-success/[0.04] px-5 py-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-accent-success/30 bg-accent-success/10 text-accent-success">
              <Shield size={16} aria-hidden="true" />
            </span>
            <p className="text-sm leading-6 text-subtle">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-success">Pre-flight check</span>
              <span className="mt-1 block">
                The app verifies its database before it boots — <strong className="font-mono text-fg">98.4%</strong> of checks pass, backed by 214 test cases.
              </span>
            </p>
          </div>
        </section>

        {/* ══ 04 // TECH STACK ══════════════════════════════════════════════ */}
        <section id="stack" aria-label="Built in the open" className="scroll-mt-16 border-t border-line py-16 sm:py-24">
          <SectionHeader
            number="04"
            eyebrow="Tech stack"
            title="Built in"
            accent="the open."
            subtitle="Six building blocks, each with one job — from the editor in your browser to the sandbox that runs your code."
            id="stack-title"
          />

          {/* Stack cards — scope-tinted icon + scope dot, one idea per card, generous spacing */}
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {dependencies.map(({ value, packages, scope, icon: Icon, why, candidate }) => {
              const accent = candidate ? null : scopeAccent[scope as StackScope];
              return (
              <article
                key={value}
                className={`group relative flex flex-col rounded-card border p-5 transition duration-300 hover:-translate-y-1 sm:p-6 ${
                  candidate
                    ? "border-dashed border-accent-warning/40 bg-accent-warning/[0.04] hover:border-accent-warning/60 md:col-span-2 lg:col-span-3"
                    : `border-line bg-surface ${accent?.cardHover} hover:bg-surface-hover`
                }`}
              >
                {/* Heading row: tinted icon left, scope eyebrow right — stacked, never inline-squeezed */}
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition duration-300 group-hover:scale-105 ${
                      candidate ? "border-accent-warning/40 bg-accent-warning/10 text-accent-warning" : `${accent?.iconFrame} ${accent?.text}`
                    }`}
                  >
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${candidate ? "bg-accent-warning" : accent?.dot}`} aria-hidden="true" />
                    <span className={`font-mono text-[10px] uppercase tracking-[0.18em] ${candidate ? "text-accent-warning" : accent?.text}`}>
                      {scope}
                    </span>
                  </span>
                </div>

                <h3 className="mt-5 font-mono text-lg font-bold tracking-tight text-fg">{value}</h3>
                <p className="mt-2 text-sm leading-6 text-subtle">{why}</p>

                <ul
                  className={`mt-5 flex flex-wrap gap-2 border-t pt-5 ${candidate ? "border-accent-warning/25" : "border-line"}`}
                  aria-label={`${value} packages`}
                >
                  {packages.map((pkg) => (
                    <li
                      key={pkg}
                      className={`rounded-full border px-3 py-1 font-mono text-[11px] ${
                        candidate
                          ? "border-dashed border-accent-warning/40 bg-base text-accent-warning"
                          : "border-line bg-base text-fg transition group-hover:border-line-mid"
                      }`}
                    >
                      {pkg}
                    </li>
                  ))}
                </ul>
              </article>
              );
            })}
          </div>
        </section>

        {/* ══ 05 // OPERATIVE / CREDIT ══════════════════════════════════════ */}
        <section id="credits" aria-labelledby="credits-title" className="scroll-mt-16 border-t border-line py-16 sm:py-24">
          <div className="rounded-card border border-accent-primary/25 bg-accent-primary/[0.04] p-6 transition duration-300 hover:border-accent-primary/40 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-accent-primary">
                  <span className="h-2 w-2 rounded-full bg-accent-primary shadow-[0_0_10px_rgba(0,212,255,0.9)]" aria-hidden="true" />
                  Operative / Developer Credit
                </div>
                <h2 id="credits-title" className="font-mono text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                  {operative.name} <span className="font-mono text-sm font-normal text-subtle">@{operative.handle}</span>
                </h2>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-accent-primary">{operative.role}</p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-subtle">{operative.bio}</p>

                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Areas of focus">
                  {operative.focus.map((area) => (
                    <li key={area} className="rounded-full border border-line bg-base px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-subtle">
                      {area}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Links sit on the right side as a horizontal row — never stacked one under another */}
              <div className="flex shrink-0 flex-wrap gap-2.5 lg:max-w-md lg:justify-end">
                {operativeLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-base px-4 py-2 font-mono text-xs text-subtle transition hover:-translate-y-0.5 hover:border-accent-primary/60 hover:text-accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
                  >
                    {link.label} <ArrowUpRight size={12} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="mx-auto flex max-w-6xl justify-between border-t border-line px-4 py-4 font-mono text-[10px] uppercase tracking-widest text-faint sm:px-6 lg:px-8">
        <span>BRACE // RCE — MIT LICENSE</span>
        <span>system integrity: nominal</span>
      </footer>
    </main>
  );
};

export default About;
