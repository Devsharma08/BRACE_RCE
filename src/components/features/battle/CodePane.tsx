export function CodePane({
  title,
  subtitle,
  tone,
  code,
}: {
  title: string;
  subtitle: string;
  tone: "cyan" | "violet" | "rose";
  code: string;
}) {
  const toneRing =
    tone === "cyan"
      ? "border-accent-primary/20"
      : tone === "violet"
        ? "border-accent-violet/20"
        : "border-accent-danger/20";
  const toneText =
    tone === "cyan"
      ? "text-accent-primary"
      : tone === "violet"
        ? "text-accent-violet"
        : "text-accent-danger";
  return (
    <div className={`overflow-hidden rounded-card border ${toneRing} bg-void`}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <p
          className={`text-[10px] font-bold uppercase tracking-widest ${toneText}`}
        >
          {title}
        </p>
        <p className="text-[9px] text-faint">{subtitle}</p>
      </div>
      <pre className="max-h-72 overflow-auto p-4 text-[11px] leading-5 text-fg">
        <code>{code}</code>
      </pre>
    </div>
  );
}
