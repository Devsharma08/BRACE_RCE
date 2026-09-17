import { memo, useState } from "react";
import { ShieldAlert, Eye, Send } from "lucide-react";
import { api } from "../../config/api";

/**
 * Spectator + Replay panel stub (ROADMAP §4).
 * Live spectating rides on existing socket events (request_player_code /
 * live_code_update); this panel adds a "join as spectator" entry point and a
 * submission-timeline replay list fed from battle performances.
 */
export const SpectatorReplayPanel = memo(({
  roomId,
  performances,
  isSpectator,
  onWatch,
}: {
  roomId: string;
  performances: any[];
  isSpectator: boolean;
  onWatch: (userId: string) => void;
}) => {
  const [replayIdx, setReplayIdx] = useState(0);
  const [report, setReport] = useState<string | null>(null);

  const timeline = (performances || []).flatMap((p: any) =>
    (p.submissions || []).map((s: any) => ({
      at: s.createdAt,
      user: p.user?.username || p.userId,
      status: s.status,
      passed: `${s.passedCase}/${s.totalCases}`,
    })),
  ).sort((a: any, b: any) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const sendFocusReport = async () => {
    try {
      const raw = localStorage.getItem("brace-focus-events");
      const events = raw ? JSON.parse(raw) : [];
      const res = await api.post("/roadmap/focus-report", {
        events,
        startMs: Date.now() - 30 * 60 * 1000,
        endMs: Date.now(),
      });
      setReport(res.data.flagged ? `⚠️ ${res.data.reason}` : `✅ ${res.data.reason}`);
    } catch {
      setReport("Focus report unavailable");
    }
  };

  return (
    <div className="rounded-card border border-subtle-line bg-surface p-4">
      <p className="mb-3 flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-secondary">
        <Eye className="h-3.5 w-3.5 text-accent-primary" />
        {isSpectator ? `SPECTATING // ${roomId}` : "REPLAY THEATER // SUBMISSION TIMELINE"}
      </p>

      {!isSpectator && performances.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {performances.map((p: any) => (
            <button
              key={p.userId || p.user?.id}
              onClick={() => onWatch(p.userId || p.user?.id)}
              className="rounded-btn border border-accent-primary/30 px-2 py-1 text-[10px] font-mono text-accent-primary transition-colors hover:bg-accent-primary/10"
            >
              WATCH {p.user?.username || "PLAYER"}
            </button>
          ))}
        </div>
      )}

      {timeline.length === 0 ? (
        <p className="text-[10px] font-mono text-muted">NO SUBMISSION EVENTS YET.</p>
      ) : (
        <div className="flex flex-col gap-1 max-h-40 overflow-auto">
          {timeline.map((t: any, i: number) => (
            <button
              key={i}
              onClick={() => setReplayIdx(i)}
              className={`text-left text-[10px] font-mono px-2 py-1 border transition-colors ${
                i === replayIdx ? "border-accent-primary/60 bg-accent-primary/10 text-accent-primary" : "border-subtle-line text-subtle hover:border-border-hi"
              }`}
            >
              #{i + 1} {t.user} — {t.status} ({t.passed})
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-subtle-line pt-3">
        <ShieldAlert className="h-3.5 w-3.5 text-accent-warning" />
        <button onClick={sendFocusReport} className="flex items-center gap-1 text-[10px] font-mono text-accent-warning hover:text-fg">
          <Send className="w-3 h-3" /> SUBMIT FOCUS-LOSS REPORT
        </button>
        {report && <span className="text-[10px] font-mono text-subtle">{report}</span>}
      </div>
    </div>
  );
});
