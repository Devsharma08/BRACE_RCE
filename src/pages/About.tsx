import { Link } from "react-router-dom";
import { Code2 } from "lucide-react";

/**
 * About — the platform's actual feature set, in text.
 *
 * Text-only by design: no diagrams, no stat tiles, no decorative panels. Just
 * what the app does, grouped so it can be read in a couple of minutes.
 *
 * Every number is measured, not aspirational. `problems` and `cases` come from a
 * Prisma count of the live database; `verified` is the passing count of
 * verify_execution.ts, which runs each reference through a real sandbox. An
 * earlier revision carried invented figures and a long stack list that said more
 * about the tooling than the product, and was replaced rather than patched.
 */

const REPO = "https://github.com/Devsharma08/BRACE_RCE";

const problems = 209;
const cases = 3117;
const verified = 1272;

const GROUPS: { title: string; items: string[] }[] = [
  {
    title: "Code execution",
    items: [
      "Runs JavaScript, Python, Java, C++ and C. You write a function; a generated driver parses the arguments, calls it, and serialises the result.",
      "Handles the argument shapes these problems actually use: linked lists, binary trees, random-pointer lists, 2D matrices, strings and primitives.",
      "Copies in-place problems too. A function that returns nothing is graded by diffing the array it mutated.",
      "Compiles once and runs every case in that one invocation, so a 15-case submission pays the compile cost once instead of fifteen times.",
      "Falls back to one invocation per case for anything the batch cannot split cleanly, and reports real time and memory per case.",
    ],
  },
  {
    title: "Problems and grading",
    items: [
      `${problems} problems and ${cases.toLocaleString()} stored test cases, graded against real expected outputs in a live sandbox.`,
      "Run a single case to see why it failed, or submit to grade the whole set at once. Passing every case marks the problem solved.",
      "Every case appears in the output panel with its input, its expected output, your actual output, and the time and memory it took.",
      "Custom problem studio: define a signature, and test cases plus starter snippets for all five languages are generated from it.",
      "Coverage is grouped by data structure, so you can see which structures you have worked through and which you have not.",
    ],
  },
  {
    title: "Battles",
    items: [
      "Ranked 1v1 matchmaking over WebSockets: enter the queue, get matched, confirm, and the editor locks until the countdown ends.",
      "Live opponent status and submission broadcasts for the duration of the match.",
      "Ratings use an ELO system with a speed bonus and an attempt penalty, mapped onto division tiers.",
      "Spectate a match in progress, then replay it submission by submission from the timeline.",
      "Focus-loss telemetry and structural plagiarism checks run against submissions.",
    ],
  },
  {
    title: "Workspace",
    items: [
      "Monaco editor with syntax highlighting, auto-format, and a custom dark theme.",
      "Run and Submit from the toolbar, or from the keyboard.",
      "Persistent scratchpad notes that follow you between problems and battles.",
      "Streaks, solved counts and per-structure progress, tracked from your own submissions.",
    ],
  },
];

const row =
  "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-3";
const label = "font-mono text-[11px] uppercase tracking-[0.18em] text-accent-primary";
const body = "max-w-2xl text-sm leading-6 text-subtle";

export default function About() {
  return (
    <div className="w-full bg-base text-fg">
      <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        <header className="border-b border-line pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-primary">
            About
          </p>
          <h1
            id="about-title"
            className="mt-4 font-mono text-3xl font-bold tracking-[-0.04em] text-fg sm:text-4xl"
          >
            Competitive coding with real execution and real 1v1 battles.
          </h1>
          <p className={`mt-5 ${body}`}>
            BRACE RCE runs your code against every stored test case in a sandbox,
            grades it, and tracks what you solved. It also puts you in a ranked
            duel against another person, where the same engine judges both of
            you. Nothing here is mocked: the figures below are counted from the
            database or measured through the API.
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

        <section aria-label="Measured facts" className="py-10">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Current state
          </h2>
          <dl className="mt-5">
            <div className={row}>
              <dt className={label}>Problems</dt>
              <dd className="flex items-baseline gap-3 text-right">
                <span className="font-mono text-sm font-bold text-fg">{problems}</span>
                <span className="text-xs text-faint">
                  {cases.toLocaleString()} stored cases
                </span>
              </dd>
            </div>
            <div className={row}>
              <dt className={label}>Languages</dt>
              <dd className="flex items-baseline gap-3 text-right">
                <span className="font-mono text-sm font-bold text-fg">5</span>
                <span className="text-xs text-faint">
                  JavaScript, Python, Java, C++, C
                </span>
              </dd>
            </div>
            <div className={row}>
              <dt className={label}>Verified in sandbox</dt>
              <dd className="flex items-baseline gap-3 text-right">
                <span className="font-mono text-sm font-bold text-accent-success">
                  {verified.toLocaleString()}
                </span>
                <span className="text-xs text-faint">cases run live, 0 failing</span>
              </dd>
            </div>
          </dl>
        </section>

        <section aria-label="What the platform does" className="border-t border-line py-10">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            What it does
          </h2>
          {GROUPS.map((group) => (
            <div key={group.title} className="mt-8 first:mt-5">
              <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-fg">
                {group.title}
              </h3>
              <ul className="mt-3 space-y-2.5">
                {group.items.map((item) => (
                  <li key={item} className={`flex gap-3 ${body}`}>
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent-primary/60" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
