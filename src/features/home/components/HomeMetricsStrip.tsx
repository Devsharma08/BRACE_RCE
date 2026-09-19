import { MetricCard } from "../../../components/ui/MetricCard";

// ─── HomeMetricsStrip ────────────────────────────────────────────────────────
// Proof strip below the hero. Values come from the same local harness snapshot
// as the About telemetry — no invented vanity numbers.
const metrics = [
  {
    label: "Runtimes online",
    value: "05",
    unit: "langs",
    description: "JS · PY · JAVA · C · C++ behind one sandbox contract.",
    dotTone: "live" as const,
  },
  {
    label: "DB pre-flight",
    value: "98.4",
    unit: "% pass",
    description: "Schema, seed, and query checks before any run.",
    dotTone: "live" as const,
  },
  {
    label: "Suite cases green",
    value: "214",
    unit: "cases",
    description: "Visible, hidden, and edge tiers exercised per cycle.",
    dotTone: "live" as const,
  },
  {
    label: "Sandbox isolation",
    value: "100",
    unit: "% by design",
    description: "Per-run CPU, memory, and wall-clock ceilings.",
    dotTone: "active" as const,
  },
];

const HomeMetricsStrip = () => (
  <section aria-labelledby="home-proof-title" className="w-full border-t border-subtle-line pt-8 sm:pt-10">
    <div className="mb-5 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-label">02 // System status</p>
        <h2 id="home-proof-title" className="font-mono text-lg font-bold tracking-tight text-fg sm:text-xl">Proof before execution</h2>
      </div>
      <p className="max-w-xs text-xs leading-relaxed text-subtle sm:text-right">A quick read on the local evaluation harness behind every run.</p>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
          unit={metric.unit}
          description={metric.description}
          dotTone={metric.dotTone}
        />
      ))}
    </div>
    <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-faint">
      Local evaluation harness snapshot — full telemetry contract on the About page.
    </p>
  </section>
);

export default HomeMetricsStrip;
