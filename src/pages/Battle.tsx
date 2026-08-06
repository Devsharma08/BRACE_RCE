import { useEffect, useState, useCallback ,useRef} from "react";
import { useSearchParams } from "react-router-dom";
import { fetchFileContent } from "../features/terminal/api";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/socketContext";
import MonacoIDE from "../features/terminal/components/MonacoIDE";
import type { SupportedLanguage } from "../features/terminal/types";
import { executeCode } from "../features/terminal/api";
import { Code, Swords, User, Activity, Trophy, Skull, ChevronLeft, ChevronRight, MessageSquare, Send } from "lucide-react";
import { Timer } from "../components/Timer";
import { NotesPanel } from "../components/ui/NotesPanel";

interface BattleMessage {
id:string;
socketId:string;
content:string;
createdAt:string;
}

export const Battle = () => {
  const { roomId } = useParams<{ roomId: string; oid: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oid = searchParams.get("oid");
  const { socket, isConnected,sendBattleMessage } = useSocket();
  const [isPanelOpen,setIsPanelOpen] = useState(true);

  const [code, setCode] = useState<string>(
    "// Your goal: Two Sum\n// Write your solution below!\n\nfunction twoSum(nums, target) {\n  \n}",
  );
  const [battleMessages,setBattleMessages] = useState<BattleMessage[]>([]);
  const [newBattleMessage,setNewBattleMessage] = useState("");
  const [activePanelTab,setActivePanelTab] = useState<"PROBLEM" | "CHAT">("PROBLEM");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<SupportedLanguage>("javascript");
  const [battleResult, setBattleResult] = useState<"WON" | "LOST" | null>(null);
  const [problemName, setProblemName] = useState<string>("Problem Name");
  const [problemDescription, setProblemDescription] = useState<string>(
    "Problem Description",
  );
  const [syncedTime, setSyncedTime] = useState<number | null>(null);
  // Opponent state
  const [opponentStatus, setOpponentStatus] = useState<string>("Coding...");
  const [opponentProgress, setOpponentProgress] = useState<number>(0);
  const [isSubmitting,setIsSubmitting] = useState<boolean>(false);

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

      socket.on("battle_state", (data) => {
        if (data.status === "IN_PROGRESS" && data.startedAt) {
          // Calculate DB elapsed time
          const elapsed = Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000);
          const remaining = Math.max(0, 600 - elapsed); 
          
          if (remaining === 0) {
              setBattleResult("LOST"); 
              socket?.emit("battle_action", { roomId, status: "Abandoned 🏳️", progress: 0, result: "OPPONENT_SURRENDERED" });
          } else {
              setSyncedTime(remaining);
          }
        }
      });


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

  useEffect(()=>{
    if(!socket) return ;
    const handleReceiveBattleMsg = (msg:BattleMessage)=>{
      setBattleMessages(prev=>[...prev,msg]);
    }
    socket.on("receive_battle_message",handleReceiveBattleMsg)
    return ()=>{
    socket.off("receive_battle_message",handleReceiveBattleMsg)
    }
  },[socket])

  useEffect(()=>{
    if(activePanelTab === "CHAT"){
      chatEndRef.current?.scrollIntoView({behavior:"smooth"})
    }
  },[battleMessages,activePanelTab]);

  const handleBattleMessage = (e:React.FormEvent) => {
    e.preventDefault();
    if( !newBattleMessage.trim() && roomId ) return;
    sendBattleMessage(roomId,newBattleMessage);
    setNewBattleMessage("");
  }

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
    setIsSubmitting(true);
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
    finally{
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#08090a] text-white overflow-hidden pt-16">
      
      {/* HEADER */}
      <div className="flex h-14 w-full items-center justify-between border-b border-cyan-500/20 bg-[#0b0c0e]/80 backdrop-blur-md px-6 relative z-30 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        
        {/* Left: You */}
        <div className="flex items-center gap-3 text-cyan-400 w-1/3">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <span className="font-mono text-sm font-bold tracking-wider uppercase">YOU</span>
        </div>

        {/* Center: Timer & Room Info */}
        <div className="flex flex-col items-center w-1/3 justify-center">
          {syncedTime !== null ? (
            <Timer
              initialSeconds={syncedTime}
              isActive={!battleResult}
              className="text-xl"
              onTimeUp={() => {
                setBattleResult("LOST");
                socket?.emit("battle_action", { roomId, status: "Time's Up! ⏰", progress: 0, result: "OPPONENT_SURRENDERED" });
              }}
            />
          ) : (
            <span className="font-mono text-slate-500 animate-pulse text-xs tracking-widest">SYNCING TIME...</span>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <Swords className="h-3 w-3 text-rose-500" />
            <span className="font-mono text-[9px] text-slate-500 tracking-widest uppercase">ROOM: {roomId}</span>
          </div>
        </div>

        {/* Right: Opponent Status */}
        <div className="flex items-center justify-end gap-3 text-rose-400 w-1/3">
          <span className="font-mono text-[11px] font-bold tracking-wider truncate uppercase ">
            {opponentStatus}
          </span>
          <Activity className="h-4 w-4 animate-pulse shrink-0 text-rose-500" />
        </div>
      </div>

      {/* MAIN BATTLE AREA */}
      <div className="flex-1 min-h-0 flex">
        
        {/* SLIDING PROBLEM DRAWER */}
        <div
          className={`absolute top-0 left-0 max-h-[100vh] h-full overflow-hidden w-[400px] sm:w-[450px] bg-[#050505]/95 backdrop-blur-xl border-r border-cyan-500/30 z-20 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[20px_0_50px_rgba(0,0,0,0.5)] ${
            isPanelOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* TABS HEADER */}
          <div className="flex bg-cyan-950/20 border-b border-cyan-500/20 shrink-0">
            <button 
              onClick={() => setActivePanelTab("PROBLEM")} 
              className={`flex-1 p-4 font-mono text-xs font-bold tracking-widest transition-all ${activePanelTab === "PROBLEM" ? "bg-cyan-500/20 border-b-2 border-cyan-400 text-cyan-300" : "text-slate-500 hover:bg-white/5"}`}
            >
              <Code className="w-4 h-4 mx-auto mb-1" /> PROBLEM
            </button>
            <button 
              onClick={() => setActivePanelTab("CHAT")} 
              className={`flex-1 p-4 font-mono text-xs font-bold tracking-widest transition-all ${activePanelTab === "CHAT" ? "bg-cyan-500/20 border-b-2 border-cyan-400 text-cyan-300" : "text-slate-500 hover:bg-white/5"}`}
            >
              <MessageSquare className="w-4 h-4 mx-auto mb-1" /> CHAT
            </button>
          </div>

          {/* TAB CONTENT (SCROLLABLE) */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide flex flex-col custom-scrollbar">
            {activePanelTab === "PROBLEM" ? (
              <div className="border border-white/10 w-full rounded-lg p-5 bg-black/40 shadow-inner h-max">
                <h3 className="font-mono text-sm text-cyan-400 mb-4 flex items-center gap-2 uppercase tracking-wider border-b border-white/5 pb-3">
                  <Code className="w-4 h-4" /> PROBLEM: {problemName}
                </h3>
                <div
                  className="text-sm text-slate-300 leading-relaxed font-sans prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: problemDescription }}
                />
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-4">
                  {battleMessages.length === 0 && <p className="text-center text-slate-500 font-mono text-xs mt-4">NO MESSAGES YET</p>}
                  {battleMessages.map(msg => {
                     const isMe = msg.socketId === socket?.id;
                     return (
                       <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                         <div className={`px-3 py-2 rounded-xl max-w-[85%] font-mono text-sm ${isMe ? 'bg-cyan-900/40 border border-cyan-500/30 text-cyan-100' : 'bg-slate-800/50 border border-slate-700 text-slate-300'}`}>
                           {msg.content}
                         </div>
                       </div>
                     );
                  })}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleBattleMessage} className="mt-auto flex gap-2 pt-2 border-t border-cyan-500/20 shrink-0">
                  <input 
                    type="text" 
                    value={newBattleMessage} 
                    onChange={(e) => setNewBattleMessage(e.target.value)} 
                    placeholder="TRANSMIT..." 
                    className="flex-1 bg-black/50 border border-slate-700 p-3 rounded-lg text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                  />
                  <button type="submit" className="p-3 bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg transition-all">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 mt-auto p-6 border-t border-cyan-500/20 bg-black/20">
            <button
              onClick={handleRunCode}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 w-full py-4 bg-cyan-900/40 hover:bg-cyan-600 border border-cyan-500/50 hover:border-cyan-400 text-cyan-100 font-mono text-sm font-bold tracking-[0.2em] rounded-lg transition-all shadow-[0_0_15px_rgba(34,211,238,0.15)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Activity className="w-5 h-5 animate-pulse text-cyan-300" />
                  [ EXECUTING... ]
                </>
              ) : (
                "[ SUBMIT BATTLE ]"
              )}
            </button>
            <button
              onClick={handleSurrender}
              disabled={isSubmitting}
              className="w-full py-3 bg-rose-950/20 hover:bg-rose-900/60 border border-rose-500/20 hover:border-rose-500/80 text-rose-400/80 hover:text-rose-300 font-mono text-xs font-bold tracking-[0.1em] rounded-lg transition-all disabled:opacity-50"
            >
              [ SURRENDER ]
            </button>
          </div>
        </div>

        {/* DRAWER TOGGLE BUTTON */}
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`absolute top-1/2 -translate-y-1/2 z-30 bg-[#0b0c0e] border border-cyan-500/30 text-cyan-400 p-2 rounded-r-lg hover:bg-cyan-900/40 hover:text-cyan-300 transition-all duration-300 shadow-[4px_0_15px_rgba(0,0,0,0.5)] ${
            isPanelOpen ? "left-[400px] sm:left-[450px]" : "left-0"
          }`}
        >
          {isPanelOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {/* FULLSCREEN EDITOR AREA (SHIFTS TO THE RIGHT WHEN DRAWER IS OPEN) */}
        <div 
          className={`flex-1 h-full relative z-10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isPanelOpen ? "pl-[400px] sm:pl-[450px]" : "pl-0"
          }`}
        >
          <MonacoIDE
            code={code}
            language={language}
            oid="battle-file"
            fileKey="battle"
            onCodeChange={handleCodeChange}
            handleRunCode={handleRunCode as any}
          />
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
               <div className={`absolute inset-0 blur-xl ${battleResult === "WON" ? "bg-cyan-500/30" : "bg-rose-500/30"}`} />
               {battleResult === "WON" ? (
                 <Trophy className="w-16 h-16 text-cyan-400 relative z-10 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
               ) : (
                 <Skull className="w-16 h-16 text-rose-500 relative z-10 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
               )}
            </div>
            {/* Result Text */}
            <h2 className={`font-mono text-3xl font-bold tracking-widest mb-3 ${battleResult === "WON" ? "text-cyan-400" : "text-rose-500"}`}>
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
              className={`w-full py-4 font-mono font-bold tracking-widest rounded-lg transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] ${
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
