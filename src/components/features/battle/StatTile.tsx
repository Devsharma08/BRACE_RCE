import { Target, Clock3, Code2, Check } from "lucide-react";

const ICON_MAP: Record<string, typeof Target> = {
  Target,
  Clock3,
  Code2,
  Check,
};

export function Stat({
  icon: IconName,
  label,
  value,
  tone = "text-fg",
}: {
  icon: keyof typeof ICON_MAP;
  label: string;
  value: string;
  tone?: string;
}) {
  const Icon = ICON_MAP[IconName] || Target;
  return (
    <div className="group flex items-center gap-3 rounded-card border border-line bg-void/80 p-3.5 transition-colors hover:border-line-mid hover:bg-surface-hover">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-btn border border-line bg-surface-hover text-faint transition-colors group-hover:border-accent-primary/25 group-hover:text-accent-primary">
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-widest text-faint">
          {label}
        </p>
        <p className={`mt-1 text-xl font-bold leading-none ${tone}`}>{value}</p>
      </div>
    </div>
  );
}

export function MiniMetric({
  icon: IconName,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-3 text-[10px]">
      <span className="flex items-center gap-2 text-faint">
        <IconName size={13} /> {label}
      </span>
      <b className="text-fg">{value}</b>
    </div>
  );
}
