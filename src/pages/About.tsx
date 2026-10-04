import { Link } from "react-router-dom";
import { Code2 } from "lucide-react";

/**
 * About — deliberately short.
 *
 * Every number below is measured, not aspirational:
 *   - 194 problems / 2,500 cases comes from a Prisma count of the live DB.
 *   - 893 and 50 are the passing counts of verify_execution.ts and
 *     verify_wrapper_shapes.ts, which run against a real Piston sandbox.
 *   - The timings are end-to-end through /api/execute on a 13-case submission.
 * The previous revision of this page carried invented figures (a hardcoded
 * "DB pre-flight 98.4%") and a lot of copy; both are gone.
 */

const REPO = "https://github.com/Devsharma08/BRACE_RCE";

const FACTS = [
  { label: "Problems", value: "194", note: "2,500 stored cases, 11–13 each" },
  { label: "Languages", value: "5", note: "JavaScript, Python, C, C++, Java" },
  { label: "Bank verified", value: "893", note: "cases run through a real sandbox" },
  { label: "Wrapper shapes", value: "50", note: "10 shapes × 5 languages" },
];

const EXECUTION = [
  {
    step: "Wrap",
    body: "A starter snippet becomes a compilable program. The driver is generated per language, and C++ and Java parse the signature at runtime.",
  },
  {
    step: "Batch",
    body: "All test cases go into one sandbox invocation behind a __CASE__ header, so the compile or VM startup is paid once instead of per case.",
  },
  {
    step: "Judge",
    body: "Each case's output line is compared with the stored answer. Anything the batch cannot account for falls back to one invocation per case.",
  },
];

const TIMINGS = [
  { language: "JavaScript", before: 3.4, after: 2.3 },
  { language: "C++", before: 22.0, after: 6.8 },
  { language: "Java", before: 51.1, after: 3.9 },
];

const STACK = [
  { name: "React 19", where: "client" },
  { name: "Vite", where: "client" },
  { name: "Tailwind CSS 4", where: "client" },
  { name: "TanStack Query", where: "client" },
  { name: "Monaco Editor", where: "client" },
  { name: "Socket.IO", where: "both" },
  { name: "Express", where: "server" },
  { name: "Prisma", where: "server" },
  { name: "PostgreSQL", where: "server" },
  { name: "Piston", where: "server" },
  { name: "OpenTelemetry", where: "server" },
];

const row =
  "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-3";
const label = "font-mono text-[11px] uppercase tracking-[0.18em] text-accent-primary";
const body = "max-w-2xl text-sm leading-6 text-subtle";

export default function About() {
  return (
    <div className="w-full bg-base text-fg">
      <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        {/* ── Header — left aligned ─────────────────────────── */}
        <header className="border-b border-line pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-primary">
            About
          </p>
          <h1
            id="about-title"
            className="mt-4 font-mono text-3xl font-bold tracking-[-0.04em] text-fg sm:text-4xl"
          >
            A DSA practice platform with real multi-language execution.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-subtle">
            Write a solution in one of five languages, submit it, and it runs
            against every stored test case in a real sandbox. Nothing is mocked:
            the numbers on this page are counted from the database or measured
            through the API.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/terminal"
              className="inline-flex items-center gap-2 rounded-btn bg-accent-primary px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition hover:bg-accent-primary/85"
            >
              Open the workspace
            </Link>
            <a
              href={REPO}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-btn border border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-fg transition hover:border-accent-primary/60 hover:text-accent-primary"
            >
              <Code2 size={13} /> Source
            </a>
          </div>
        </header>

        {/* ── Facts ──────────────────────────────────────────── */}
        <section aria-label="Measured facts" className="py-10">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Current state
          </h2>
          <dl className="mt-5">
            {FACTS.map((f) => (
              <div key={f.label} className={row}>
                <dt className={label}>{f.label}</dt>
                <dd className="flex items-baseline gap-3 text-right">
                  <span className="font-mono text-sm font-bold text-fg">{f.value}</span>
                  <span className="text-xs text-faint">{f.note}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── How execution works ────────────────────────────── */}
        <section aria-label="How execution works" className="border-t border-line py-10">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            How a submission is judged
          </h2>
          <ol className="mt-5 space-y-5">
            {EXECUTION.map((s, i) => (
              <li key={s.step} className="flex gap-4">
                <span className="mt-0.5 font-mono text-xs text-accent-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-fg">
                    {s.step}
                  </h3>
                  <p className={`mt-1 ${body}`}>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Measured timings ───────────────────────────────── */}
        <section aria-label="Measured execution timings" className="border-t border-line py-10">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            13-case submission, end to end
          </h2>
          <p className={`mt-2 ${body}`}>
            Batching test cases into one sandbox invocation removed the repeated
            compile and VM startup. Measured through the live API on Two Sum.
          </p>
          <dl className="mt-5">
            {TIMINGS.map((t) => (
              <div key={t.language} className={row}>
                <dt className={label}>{t.language}</dt>
                <dd className="font-mono text-xs text-subtle">
                  <span className="text-faint line-through">{t.before}s</span>
                  <span className="px-2 text-faint">→</span>
                  <span className="font-bold text-accent-success">{t.after}s</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Stack ──────────────────────────────────────────── */}
        <section aria-label="Built in the open" className="border-t border-line py-10">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Built with
          </h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {STACK.map((s) => (
              <li
                key={s.name}
                className="inline-flex items-center gap-2 rounded-btn border border-line px-3 py-1.5 font-mono text-[11px] text-subtle"
              >
                {s.name}
                <span className="text-[9px] uppercase tracking-widest text-faint">
                  {s.where}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="border-t border-line pt-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            Built by Dev Sharma · MIT
          </p>
        </footer>
      </div>
    </div>
  );
}
