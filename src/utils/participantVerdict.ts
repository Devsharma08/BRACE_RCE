/**
 * Shared participant-completion helpers for group battles.
 * A participant COMPLETED the event iff any of their submissions PASSED;
 * otherwise (no pass before expiry) they are marked TIMEOUT.
 */
export type CompletionVerdict = "COMPLETED" | "TIMEOUT" | "IN_PROGRESS";

export const participantVerdict = (
  performance: { status?: string | null; submissions?: Array<{ status?: string | null }> | null },
  eventStatus?: string | null,
): CompletionVerdict => {
  const subs = performance?.submissions ?? [];
  if (subs.some((s) => (s?.status || "").toUpperCase() === "PASSED")) return "COMPLETED";
  const st = (performance?.status || "").toUpperCase();
  if (st === "COMPLETED" || st === "PASSED" || st === "WON") return "COMPLETED";
  if ((eventStatus || "").toUpperCase() === "FINISHED") return "TIMEOUT";
  if (st === "TIMEOUT" || st === "FAILED" || st === "SURRENDER") return "TIMEOUT";
  return "IN_PROGRESS";
};

export const verdictStyle = (verdict: CompletionVerdict): string => {
  if (verdict === "COMPLETED") return "text-emerald-400 border-emerald-500/40 bg-emerald-950/30";
  if (verdict === "TIMEOUT") return "text-rose-400 border-rose-500/40 bg-rose-950/30";
  return "text-slate-400 border-white/10 bg-black/40";
};