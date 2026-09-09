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
    <div className="bg-[#06080e] border border-white/10 p-4">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-slate-500 mb-3 flex items-center gap-2">
        <Eye className="w-3.5 h-3.5 text-purple-400" />
        {isSpectator ? `SPECTATING // ${roomId}` : "REPLAY THEATER // SUBMISSION TIMELINE"}
      </p>

      {!isSpectator && performances.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {performances.map((p: any) => (
            <button
              key={p.userId || p.user?.id}
              onClick={() => onWatch(p.userId || p.user?.id)}
              className="text-[10px] font-mono px-2 py-1 border border-purple-500/40 text-purple-300 hover:bg-purple-500/20 transition-colors"
            >
              WATCH {p.user?.username || "PLAYER"}
            </button>
          ))}
        </div>
      )}

      {timeline.length === 0 ? (
        <p className="text-[10px] text-slate-600 font-mono">NO SUBMISSION EVENTS YET.</p>
      ) : (
        <div className="flex flex-col gap-1 max-h-40 overflow-auto">
          {timeline.map((t: any, i: number) => (
            <button
              key={i}
              onClick={() => setReplayIdx(i)}
              className={`text-left text-[10px] font-mono px-2 py-1 border transition-colors ${
                i === replayIdx ? "border-cyan-500/60 bg-cyan-950/30 text-cyan-200" : "border-white/5 text-slate-400 hover:border-white/20"
              }`}
            >
              #{i + 1} {t.user} — {t.status} ({t.passed})
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
        <button onClick={sendFocusReport} className="text-[10px] font-mono text-amber-300 flex items-center gap-1 hover:text-amber-200">
          <Send className="w-3 h-3" /> SUBMIT FOCUS-LOSS REPORT
        </button>
        {report && <span className="text-[10px] font-mono text-slate-400">{report}</span>}
      </div>
    </div>
  );
});
