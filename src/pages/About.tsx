import { ArrowUpRight, BookOpen, CheckCircle2, Code2, GitBranch, Shield, Terminal } from "lucide-react";

const repository = "https://github.com/Devsharma08/BRACE_RCE";

// Aspirations, not release commitments or claims of shipped functionality.
const futureGoals = [
  { title: "Learn from every solution", label: "Learning tools", description: "Explore guided explanations, complexity insights, and more useful post-solve feedback that help explain the reasoning, not just the verdict." },
  { title: "Make practice more personal", label: "Practice journey", description: "Build topic-based learning paths and progress milestones that turn individual problems into a consistent DSA practice habit." },
  { title: "Create together", label: "Community", description: "Grow community problem-authoring and review workflows, with better tools for sharing well-tested challenges and learning from one another." },
  { title: "Take the arena further", label: "Competition", description: "Explore tournaments and additional multiplayer formats after the current battle experience is stable, accessible, and thoroughly reviewed." },
];

const development = [
  { label: "Implemented UI", title: "A clearer starting point", description: "Home now brings Terminal, Problems, and Battle Arena together in a launch rail. The pixel hero keeps its boot and pointer effects with container-based framing, while category cards use a stationary responsive grid.", tone: "text-accent-success border-accent-success/30 bg-accent-success/10" },
  { label: "In progress", title: "One arena design language", description: "Rounded surfaces, semantic colors, clearer controls, and responsive layouts are being brought across the app. Friends, Battle, and editor workspace refinements remain ongoing rather than a finished redesign.", tone: "text-accent-warning border-accent-warning/30 bg-accent-warning/10" },
  { label: "Verification pending", title: "Responsive & interaction review", description: "Automated tests and production builds cover parts of the implementation. Browser-level checks for narrow-screen overflow, focus states, animation, and editor or drawer overlap are still outstanding.", tone: "text-accent-primary border-accent-primary/30 bg-accent-primary/10" },
];

const stack = [
  { title: "Interface", value: "React · TypeScript · Vite", description: "Tailwind semantic tokens, Monaco editing, and React Query data flows." },
  { title: "API & realtime", value: "Express · Socket.io", description: "HTTP APIs for application data and socket events for multiplayer workflows." },
  { title: "Persistence", value: "PostgreSQL · Prisma", description: "User, problem, room, and performance data behind the application." },
];

const externalLinkClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-btn border border-subtle-line bg-surface px-4 py-3 text-sm font-semibold text-fg transition-colors hover:border-accent-primary/50 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-primary";

const About = () => {
  return (
    <div className="w-full min-w-0 bg-base font-sans text-fg">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <section aria-labelledby="about-title" className="grid gap-8 border-b border-subtle-line py-12 sm:py-16 lg:grid-cols-5 lg:items-center">
          <div className="min-w-0 lg:col-span-3">
            <p className="mb-4 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-accent-primary">
              <Terminal className="h-4 w-4 shrink-0" aria-hidden="true" /> About // BRACE RCE
            </p>
            <h1 id="about-title" className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Build your skills.<br /><span className="text-accent-primary">Bring them to the arena.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-subtle sm:text-lg">
              BRACE RCE connects a multi-language coding workspace, algorithm practice, and real-time coding battles. Built by Dev Sharma, with the project developed in the open on GitHub.
            </p>
            <a href={repository} target="_blank" rel="noopener noreferrer" className={`${externalLinkClass} mt-6`}>
              <GitBranch className="h-4 w-4 shrink-0" aria-hidden="true" /> Explore the repository <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          </div>
          <aside aria-label="Project snapshot" className="min-w-0 rounded-card border border-subtle-line bg-surface p-5 sm:p-6 lg:col-span-2">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-subtle-line pb-4">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent-primary">Project snapshot</span>
              <span className="rounded-btn border border-accent-warning/30 bg-accent-warning/10 px-2 py-1 text-xs font-medium text-accent-warning">Active development</span>
            </div>
            <dl className="space-y-5">
              <div><dt className="font-mono text-xs uppercase tracking-wider text-subtle">Workflow</dt><dd className="mt-1 font-semibold">Write → Run → Review → Compete</dd></div>
              <div><dt className="font-mono text-xs uppercase tracking-wider text-subtle">Languages</dt><dd className="mt-1 leading-relaxed">JavaScript · Python · Java · C++ · C</dd></div>
              <div><dt className="font-mono text-xs uppercase tracking-wider text-subtle">Current focus</dt><dd className="mt-1 leading-relaxed">Clearer navigation, consistent surfaces, and responsive workspaces.</dd></div>
            </dl>
            <p className="mt-6 border-t border-subtle-line pt-4 text-xs leading-relaxed text-subtle">This page describes the implementation, not live service availability or a production-readiness guarantee.</p>
          </aside>
        </section>

        <section aria-labelledby="journey-title" className="grid gap-4 border-b border-subtle-line py-12 sm:py-16 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col justify-between rounded-card border border-accent-primary/30 bg-surface p-6 sm:p-8 lg:row-span-2">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-accent-primary">01 // The story behind the code</p>
            <div className="mt-10">
              <h2 id="journey-title" className="text-3xl font-black tracking-tight sm:text-4xl">Two passions.<br /><span className="text-accent-primary">One project.</span></h2>
              <p className="mt-4 leading-relaxed text-subtle">BRACE RCE is where my DSA journey meets my web development skills. A place to turn the algorithms I learn into experiences I can build and share.</p>
              <p className="mt-6 font-mono text-sm text-fg">— Dev Sharma</p>
            </div>
          </div>
          <article className="min-w-0 rounded-card border border-subtle-line bg-surface p-6 sm:p-8 lg:col-span-2">
            <BookOpen className="mb-5 h-6 w-6 text-accent-primary" aria-hidden="true" />
            <h3 className="text-xl font-bold">Think in algorithms</h3>
            <p className="mt-3 max-w-2xl leading-relaxed text-subtle">Break a problem down, try an approach, understand the edge cases, and improve. The practice workspace brings that learning loop into one place.</p>
          </article>
          <article className="min-w-0 rounded-card border border-subtle-line bg-surface p-6 sm:p-8 md:col-span-2 lg:col-span-2">
            <Code2 className="mb-5 h-6 w-6 text-accent-success" aria-hidden="true" />
            <h3 className="text-xl font-bold">Bring ideas to the browser</h3>
            <p className="mt-3 max-w-2xl leading-relaxed text-subtle">From editor interactions to real-time battles, this project is an ongoing exercise in full-stack development. Every iteration is a chance to make the code and the experience better.</p>
          </article>
        </section>

        <section aria-labelledby="status-title" className="border-b border-subtle-line py-12 sm:py-16">
          <p className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-accent-primary">02 // Project status</p>
          <h2 id="status-title" className="text-3xl font-black tracking-tight sm:text-4xl">Built so far. Still getting better.</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-subtle">Implementation and visual sign-off are different milestones. No speculative release dates or completion percentages: the repository tracks the work as it evolves.</p>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {development.map(({ label, title, description, tone }) => (
              <article key={title} className="min-w-0 rounded-card border border-subtle-line bg-surface p-5 sm:p-6">
                <span className={`inline-flex rounded-btn border px-2 py-1 font-mono text-xs font-medium ${tone}`}>{label}</span>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-subtle">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="goals-title" className="border-b border-subtle-line py-12 sm:py-16">
          <div className="mb-8 grid gap-4 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-accent-primary">03 // Future goals</p>
              <h2 id="goals-title" className="text-3xl font-black tracking-tight sm:text-4xl">Where I want to take this next</h2>
            </div>
            <p className="max-w-xl leading-relaxed text-subtle">Directions to explore, not shipped features or release commitments. The priority is a reliable foundation before expanding the experience.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {futureGoals.map(({ title, label, description }, index) => (
              <article key={title} className="group relative min-w-0 rounded-card border border-subtle-line bg-surface p-6 transition-colors hover:border-accent-primary/40 sm:p-8">
                <div className="mb-8 flex items-center justify-between gap-4">
                  <span className="font-mono text-xs uppercase tracking-wider text-accent-primary">{label}</span>
                  <span aria-hidden="true" className="font-mono text-3xl font-black text-subtle">0{index + 1}</span>
                </div>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-subtle">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="architecture-title" className="border-b border-subtle-line py-12 sm:py-16">
          <p className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-accent-primary">04 // Engineering foundation</p>
          <h2 id="architecture-title" className="text-3xl font-black tracking-tight sm:text-4xl">Built in the open</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {stack.map(({ title, value, description }) => (
              <article key={title} className="min-w-0 rounded-card border border-subtle-line bg-surface p-5 sm:p-6">
                <p className="font-mono text-xs uppercase tracking-wider text-accent-primary">{title}</p>
                <h3 className="mt-3 text-lg font-bold">{value}</h3>
                <p className="mt-3 text-sm leading-relaxed text-subtle">{description}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-card border border-subtle-line p-5">
            <Shield className="mt-1 h-5 w-5 shrink-0 text-accent-primary" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-subtle">Code execution, runtime limits, and isolation depend on the deployment configuration. Battle focus telemetry and review tools are signals, not a guarantee of cheat prevention.</p>
          </div>
        </section>

        <section aria-labelledby="contribute-title" className="py-12 sm:py-16">
          <div className="flex flex-col gap-6 rounded-card border border-subtle-line bg-surface p-5 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 max-w-2xl">
              <p className="mb-3 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-accent-primary"><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> Community // Contributions</p>
              <h2 id="contribute-title" className="text-2xl font-black tracking-tight sm:text-3xl">Help shape the next iteration</h2>
              <p className="mt-3 text-sm leading-relaxed text-subtle">Report reproducible bugs, improve problem test cases, review accessibility, or contribute focused UI changes. Start with the project README and open issues.</p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
              <a href={`${repository}/issues`} target="_blank" rel="noopener noreferrer" className={externalLinkClass}>Browse project issues <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
              <a href="https://github.com/Devsharma08/DSA-LEETCODE" target="_blank" rel="noopener noreferrer" className={externalLinkClass}>DSA data repository <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
