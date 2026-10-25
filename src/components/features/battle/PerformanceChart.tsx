export function PerformanceChart({
  series,
  maxPoints,
}: {
  series: { name: string; me: boolean; color: string; points: number[] }[];
  maxPoints: number;
}) {
  const W = 420;
  const H = 160;
  const padX = 14;
  const padY = 16;
  const plotW = W - padX * 2;
  const plotH = H - padY * 2;
  const x = (i: number) =>
    padX + (maxPoints <= 1 ? plotW / 2 : (i / (maxPoints - 1)) * plotW);
  const y = (v: number) => padY + plotH - (v / 100) * plotH;

  return (
    <div className="mt-5 overflow-hidden rounded-card border border-line bg-void p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-40 w-full"
        role="img"
        aria-label="Player performance comparison chart"
        preserveAspectRatio="none"
      >
        {[0, 50, 100].map((g) => (
          <path
            key={g}
            d={`M${padX} ${y(g)}H${W - padX}`}
            stroke="var(--color-line)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
        ))}
        {series.map((s) => (
          <polyline
            key={s.name}
            points={s.points.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth={s.me ? 3 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={s.me ? 1 : 0.75}
          />
        ))}
        {series.map((s) =>
          s.points.map((v, i) => (
            <circle
              key={`${s.name}-${i}`}
              cx={x(i)}
              cy={y(v)}
              r={s.me ? 3 : 2.2}
              fill={s.color}
            />
          )),
        )}
      </svg>
      <div className="flex justify-between px-1 pt-1 text-[8px] text-faint">
        {Array.from({ length: maxPoints }).map((_, i) => (
          <span key={i}>A{i + 1}</span>
        ))}
      </div>
    </div>
  );
}
