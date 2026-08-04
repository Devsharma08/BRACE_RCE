import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchFileContent } from "../features/terminal/api";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/socketContext";
import MonacoIDE from "../features/terminal/components/MonacoIDE";
import type { SupportedLanguage } from "../features/terminal/types";
import { executeCode } from "../features/terminal/api";
import { Code, Swords, User, Activity, Trophy, Skull } from "lucide-react";
import { Timer } from "../components/Timer";
import { NotesPanel } from "../components/ui/NotesPanel";

export const Battle = () => {
  const { roomId } = useParams<{ roomId: string; oid: string }>();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const [searchParams] = useSearchParams();
  const oid = searchParams.get("oid");

  const [code, setCode] = useState<string>(
    "// Your goal: Two Sum\n// Write your solution below!\n\nfunction twoSum(nums, target) {\n  \n}",
  );
  const [language, setLanguage] = useState<SupportedLanguage>("javascript");
  const [battleResult, setBattleResult] = useState<"WON" | "LOST" | null>(null);
  const [problemName, setProblemName] = useState<string>("Problem Name");
  const [problemDescription, setProblemDescription] = useState<string>(
    "Problem Description",
  );
  // Opponent state
  const [opponentStatus, setOpponentStatus] = useState<string>("Coding...");
  const [opponentProgress, setOpponentProgress] = useState<number>(0);

  useEffect(() => {
    // Fetch the problem details when the page loads
    if (oid && oid !== "local-battle") {
      fetchFileContent(oid)
        .then((res) => {
          setProblemName(res.file.name);
          setProblemDescription(res.file.problem_definition);

          const jsSnippet = res.file.code_snippets?.find(
            (s: any) => s.language === "javascript",
          );
          if (jsSnippet) setCode(jsSnippet.code);
        })
        .catch((err) => {
          console.error("Failed to load problem", err);
        });
    }

    // Give the socket a small grace period to connect if refreshed
    const timeout = setTimeout(() => {
      if (!socket || !socket.connected) {
        navigate("/");
      }
    }, 1000);

    // Set up real-time socket listeners
    if (socket) {
      socket.emit("join_battle", roomId);

      socket.on("battle_update", (data) => {
        if (data.status) setOpponentStatus(data.status);
        if (data.progress !== undefined) setOpponentProgress(data.progress);

        // If the opponent broadcasts that they won, we instantly lose!
        if (data.result === "OPPONENT_WON") {
          setBattleResult("LOST");
        }

        // If the opponent surrenders, we win!
        if (data.result === "OPPONENT_SURRENDERED") {
          setBattleResult("WON");
        }
      });
    }

    return () => {
      clearTimeout(timeout);
      socket?.off("battle_update");
    };
  }, [socket, navigate, oid, roomId]);

  const handleSurrender = () => {
    if (confirm("Are you sure you want to surrender?")) {
      setBattleResult("LOST");
      socket?.emit("surrender_battle", roomId);
    }
  };

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);

      // Broadcast to the opponent that we are typing
      socket?.emit("battle_action", { roomId, status: "Typing..." });
    },
    [socket, roomId],
  );

  const handleRunCode = async () => {
    socket?.emit("battle_action", {
      roomId,
      status: "Running tests...",
      progress: 50,
    });

    try {
      const res = await executeCode({
        code,
        language,
        mode: "SUBMIT",
        oid: oid!,
        customInput: "",
      });
      const output = res.details?.[0]?.output || "";
      const hasError = res.details?.[0]?.runtimeError;

      if (!hasError) {
        // Victory! Broadcast the win
        socket?.emit("battle_action", {
          roomId,
          status: "All Tests Passed! 🏆",
          progress: 100,
          result: "OPPONENT_WON",
        });
        setBattleResult("WON");
      } else {
        // Failure! Broadcast the loss
        socket?.emit("battle_action", {
          roomId,
          status: "Execution Failed ❌",
          progress: 20,
        });
        alert("Execution Error:\n" + hasError);
      }
    } catch (error) {
      console.error("Execution failed", error);
      socket?.emit("battle_action", {
        roomId,
        status: "Error ❌",
        progress: 0,
      });
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#08090a] text-white overflow-hidden pt-16">
      {/* VS HEADER */}
      <div className="flex h-16 w-full items-center justify-between border-b border-white/10 bg-[#0b0c0e] px-6">
        <div className="flex items-center gap-3 text-cyan-400 w-1/3">
          <User className="h-5 w-5" />
          <span className="font-mono text-sm font-bold tracking-wider">
            YOU
          </span>
        </div>

        <div className="flex flex-col items-center w-1/3 justify-center">
          <Swords className="h-6 w-6 text-rose-500 mb-1" />
          <span className="font-mono text-[10px] text-slate-500">
            ROOM: {roomId}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 text-rose-400 w-1/3">
            <Timer
              initialSeconds={600}
              isActive={!battleResult}
              onTimeUp={() => {
                setBattleResult("LOST");
                socket?.emit("battle_action", {
                  roomId,
                  status: "Time's Up! ⏰",
                  progress: 0,
                  result: "OPPONENT_WON",
                });
              }}
            />
          <span className="font-mono text-xs font-bold tracking-wider truncate">
            {opponentStatus}
          </span>
          <Activity className="h-5 w-5 animate-pulse shrink-0" />
        </div>
      </div>

      {/* EDITOR AREA */}
      <div className="flex-1 min-h-0 flex relative">
        <div className="flex-1 h-full border-r border-white/5 relative">
          <MonacoIDE
            code={code}
            language={language}
            oid="battle-file"
            fileKey="battle"
            onCodeChange={handleCodeChange}
            handleRunCode={handleRunCode as any}
          />
        </div>

        {/* PROBLEM DESCRIPTION PANEL */}
        {/* PROBLEM DESCRIPTION PANEL */}
        <div className="w-1/3 h-full bg-[#050505] p-6 flex flex-col gap-4">
          <div className="border border-white/10 rounded-lg p-5 bg-white/5 h-2/3 overflow-y-auto custom-scrollbar">
            <h3 className="font-mono text-sm text-cyan-400 mb-3 flex items-center gap-2 uppercase">
              <Code className="w-4 h-4" /> PROBLEM: {problemName}
            </h3>
            <div
              className="text-sm text-slate-400 leading-relaxed font-sans prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: problemDescription }}
            />
          </div>
          <div className="flex gap-3 mt-auto">
            <button
              onClick={handleSurrender}
              className="w-1/3 py-4 bg-rose-900/20 hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-500 text-rose-300 font-mono font-bold tracking-widest rounded-lg transition-all"
            >
              [ SURRENDER ]
            </button>
            <button
              onClick={handleRunCode}
              className="mt-auto w-2/3 py-4 bg-cyan-900/40 hover:bg-cyan-600 border border-cyan-500/50 hover:border-cyan-400 text-cyan-100 font-mono font-bold tracking-widest rounded-lg transition-all"
            >
              [ SUBMIT BATTLE ]
            </button>
          </div>
          
        </div>
      </div>
      {/* POST BATTLE MODAL */}
      {battleResult && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center justify-center p-12 bg-[#0b0c0e] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
            {/* Glow Effects */}
            <div
              className={`absolute top-0 w-full h-1 bg-gradient-to-r ${battleResult === "WON" ? "from-cyan-400 to-emerald-500" : "from-rose-500 to-orange-500"}`}
            />
            <div
              className={`absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 blur-[80px] rounded-full ${battleResult === "WON" ? "bg-cyan-500/30" : "bg-rose-500/30"}`}
            />

            {/* Icon */}
            <div className="relative mb-6">
              {battleResult === "WON" ? (
                <Trophy className="w-20 h-20 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
              ) : (
                <Skull className="w-20 h-20 text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
              )}
            </div>

            {/* Text */}
            <h2 className="font-mono text-3xl font-bold tracking-widest text-white mb-2">
              {battleResult === "WON" ? "VICTORY ACHIEVED" : "BATTLE LOST"}
            </h2>
            <p className="text-slate-400 text-sm mb-8 font-sans">
              {battleResult === "WON"
                ? "You crushed your opponent with superior logic."
                : "Your opponent optimized their code faster. Train harder."}
            </p>

            {/* Actions */}
            <button
              onClick={() => navigate("/")}
              className={`w-full py-4 font-mono font-bold tracking-widest rounded-lg transition-all ${
                battleResult === "WON"
                  ? "bg-cyan-900/40 hover:bg-cyan-600 border border-cyan-500/50 text-cyan-100"
                  : "bg-rose-900/40 hover:bg-rose-600 border border-rose-500/50 text-rose-100"
              }`}
            >
              [ RETURN TO LOBBY ]
            </button>

            
          </div>
        </div>
      )}
      <NotesPanel storageKey={`battle-${roomId}`} />
    </div>
  );
};

export default Battle;
