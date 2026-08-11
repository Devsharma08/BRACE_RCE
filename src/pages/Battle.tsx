import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/socketContext";
import MonacoIDE from "../features/terminal/components/MonacoIDE";
import type { SupportedLanguage } from "../features/terminal/types";
import { executeCode } from "../features/terminal/api";
import { Code, Swords, Activity, Trophy, Skull, ChevronLeft, ChevronRight, MessageSquare, Send, Play, Clock, StopCircle, Lock } from "lucide-react";
import { api } from "../config/api";

interface BattleMessage {
  id: string;
  socketId: string;
  content: string;
  createdAt: string;
}

export const Battle = () => {
  const { roomId } = useParams<{ roomId: string }>(); // roomId is actually roomCode for custom rooms
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // --- ROOM / EVENT STATE ---
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [battleState, setBattleState] = useState<any>({ status: "WAITING" });
  const [isHost, setIsHost] = useState(false);
  const [battleResult, setBattleResult] = useState<"WON" | "LOST" | null>(null);
  const [opponent, setOpponent] = useState<any>(null);

  // --- PROBLEM STATE ---
  const [problems, setProblems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeProblem = problems[currentIndex];

  const [code, setCode] = useState<string>("// Initialization...");
  const [language, setLanguage] = useState<SupportedLanguage>("javascript");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // --- TIMERS ---
  const [globalTimeRemaining, setGlobalTimeRemaining] = useState<number | null>(null);
  const [localTimeRemaining, setLocalTimeRemaining] = useState<number | null>(null);
  
  // Store codes for each problem
  const [codes, setCodes] = useState<Record<string, string>>({});
  // Store local start times per problem when first visited
  const [problemStartTimes, setProblemStartTimes] = useState<Record<string, number>>({});
  const [countdown,setCountDown] = useState<number>(0);

  // --- CHAT STATE ---
  const [battleMessages, setBattleMessages] = useState<BattleMessage[]>([]);
  const [newBattleMessage, setNewBattleMessage] = useState("");
  const [activePanelTab, setActivePanelTab] = useState<"PROBLEM" | "CHAT">("PROBLEM");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Room Data
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const [roomRes, profileRes] = await Promise.all([
          api.get(`/rooms/live/${roomId}`),
          api.get("/profile")
        ]);
        
        const roomData = roomRes.data.room;
        setRoom(roomData);
        setIsHost(profileRes.data.data.id === roomData.hostId);

        let targetProblems = [];
        if (roomData.type === 'ONE_VS_ONE') {
          targetProblems = [roomData.commonProblem];
          setProblems(targetProblems);
          const myId = profileRes.data.data.id;
          const oppPerf = roomData.performances?.find((p:any) => p.user.id !== myId);
          setOpponent(oppPerf?.user || null);
        } else {
          targetProblems = roomData.problems;
          setProblems(targetProblems);
        }
        
        // Initialize codes
        const initialCodes: Record<string, string> = {};
        targetProblems.forEach((p: any) => {
          if (!p) return;
          const jsSnip = p.code_snippets?.find((s:any) => s.language === 'javascript');
          initialCodes[p.id] = jsSnip ? jsSnip.code : "// Write your code here";
        });
        setCodes(initialCodes);
        
      } catch (err: any) {
        console.error("Failed to load room", err);
        alert(`Could not join room: ${err.response?.data?.message || err.message}`);
        navigate("/lobby");
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [roomId, navigate]);

  // 2. Setup Sockets
  useEffect(() => {
    if (!socket || !roomId) return;
    
    socket.emit("join_battle", roomId);

    socket.on("battle_state", (data) => {
      setBattleState(data);
      if (data.status === "FINISHED") {
        setBattleResult("LOST"); // Default to lost if time's up
      }
    });

    socket.on("receive_battle_message", (msg) => {
      setBattleMessages(prev => [...prev, msg]);
    });
    
    socket.on("battle_update", (data) => {
      if (data.result === "OPPONENT_WON") setBattleResult("LOST");
      if (data.result === "OPPONENT_SURRENDERED") setBattleResult("WON");
    });

    return () => {
      socket.off("battle_state");
      socket.off("receive_battle_message");
      socket.off("battle_update");
    };
  }, [socket, roomId]);

  // 3. Handle Timers
  useEffect(() => {
    if (battleState.status !== "IN_PROGRESS" || battleResult) return;

    const interval = setInterval(() => {
      const now = Date.now();

      if(battleState.startedAt){
        const startDiff = new Date(battleState.startedAt).getTime() - now ;
        if(startDiff > 0 ){
          setCountDown(Math.ceil(startDiff/1000));
          return ;
        } else {
          setCountDown(0);
        }
      }
      
      // Global Timer (from server finishedAt)
      if (battleState.finishedAt) {
        const remaining = Math.max(0, new Date(battleState.finishedAt).getTime() - now);
        setGlobalTimeRemaining(remaining);
        if (remaining === 0) {
          setBattleResult("LOST");
        }
      }

      // Local Problem Timer (frontend tracked)
      if (activeProblem) {
        const pId = activeProblem.id;
        if (!problemStartTimes[pId]) {
          // Initialize start time for this problem
          setProblemStartTimes(prev => ({ ...prev, [pId]: now }));
        } else {
          const elapsed = now - problemStartTimes[pId];
          const limit = activeProblem.timeLimitMs || (15 * 60 * 1000);
          const remaining = Math.max(0, limit - elapsed);
          setLocalTimeRemaining(remaining);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [battleState, activeProblem, problemStartTimes, battleResult]);

  // Update editor when active problem changes
  useEffect(() => {
    if (activeProblem && codes[activeProblem.id]) {
      setCode(codes[activeProblem.id]);
    }
  }, [activeProblem, codes]);

  // Handlers
  const handleStartOperation = () => {
    socket?.emit("start_event", roomId);
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (activeProblem) {
      setCodes(prev => ({ ...prev, [activeProblem.id]: newCode }));
    }
  };

  const handleBattleMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBattleMessage.trim()) return;
    socket?.emit("send_battle_message", { roomId, content: newBattleMessage });
    setNewBattleMessage("");
  };

  const handleRunCode = async () => {
    if (!activeProblem) return;
    setIsSubmitting(true);
    try {
      const res = await executeCode({
        code, 
        language, 
        oid: activeProblem.github_oid || activeProblem.id,
        mode: "SUBMIT"
      });
      if (res.status === "PASSED") {
         socket?.emit("battle_action", { roomId, status: "Passed tests!", progress: 100, result: "OPPONENT_WON" });
         setBattleResult("WON");
      } else {
         socket?.emit("battle_action", { roomId, status: "Failed tests...", progress: 50 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (ms: number | null) => {
    if (ms === null) return "--:--";
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading || !room) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-cyan-500 font-mono tracking-widest animate-pulse">ESTABLISHING UPLINK...</div>;
  }

  return (

    
    <div className="flex w-full h-screen bg-[#050505] overflow-hidden relative">

      {countdown > 0 && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <h2 className="text-2xl font-bold text-cyan-400 mb-4 tracking-[0.5em]">GET READY</h2>
          <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-500 animate-pulse drop-shadow-[0_0_30px_rgba(34,211,238,0.8)]">
            {countdown}
          </div>
        </div>
      )}

      
      
      {/* LEFT PANEL */}
      <div className={`relative z-20 h-full transition-all duration-300 shrink-0 ${isPanelOpen ? "w-[450px]" : "w-0"}`}>
        <div className="w-full h-full bg-[#0b0c0e] border-r border-cyan-500/20 shadow-2xl overflow-hidden">
          <div className="flex flex-col h-full w-[450px]">
          
          {/* HOST / TIMERS HEADER */}
          <div className="p-4 border-b border-cyan-500/20 bg-black/40">
            {battleState.status === "WAITING" ? (
              <div className="text-center py-4">
                <p className="text-amber-400 font-mono text-sm tracking-widest mb-4">WAITING FOR OPERATIVES</p>
                {isHost ? (
                  <button onClick={handleStartOperation} className="w-full bg-cyan-500/20 hover:bg-cyan-500 border border-cyan-500 text-cyan-400 hover:text-black font-bold tracking-widest py-3 rounded-lg transition-all flex items-center justify-center gap-2">
                    <Play className="w-4 h-4" /> START OPERATION
                  </button>
                ) : (
                  <p className="text-slate-500 text-xs">Waiting for host to begin...</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/50 border border-cyan-500/30 rounded p-3 text-center">
                  <p className="text-[10px] text-cyan-500/60 tracking-widest mb-1 flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> GLOBAL LIMIT</p>
                  <p className={`font-mono text-xl font-bold ${globalTimeRemaining && globalTimeRemaining < 60000 ? "text-rose-500 animate-pulse" : "text-cyan-400"}`}>
                    {formatTime(globalTimeRemaining)}
                  </p>
                </div>
                <div className="bg-black/50 border border-emerald-500/30 rounded p-3 text-center">
                  <p className="text-[10px] text-emerald-500/60 tracking-widest mb-1 flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> PROBLEM LIMIT</p>
                  <p className={`font-mono text-xl font-bold ${localTimeRemaining && localTimeRemaining < 60000 ? "text-rose-500 animate-pulse" : "text-emerald-400"}`}>
                    {formatTime(localTimeRemaining)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* PROBLEM NAV GRID OR OPPONENT PROFILE */}
          {room?.type === "ONE_VS_ONE" && opponent ? (
            <div className="p-4 border-b border-rose-500/20 bg-rose-950/10 flex items-center gap-4">
              <img src={opponent.avatarUrl} alt="Opponent" className="w-12 h-12 rounded-full border border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]" />
              <div>
                <p className="text-[10px] text-rose-500 tracking-widest font-bold">VS OPPONENT</p>
                <p className="font-mono text-white text-sm font-bold">{opponent.username}</p>
                <p className="text-xs text-slate-400 mt-1">Rating: {opponent.rating || 'N/A'}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 border-b border-cyan-500/20 bg-cyan-950/10">
              <p className="text-xs text-slate-500 tracking-widest mb-3">MISSION PLAYLIST ({problems.length})</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {problems.map((p, idx) => (
                  <button 
                    key={p.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`shrink-0 w-10 h-10 rounded-lg border font-mono font-bold transition-all flex items-center justify-center
                      ${currentIndex === idx ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "bg-black/50 border-slate-700 text-slate-400 hover:border-cyan-500/50"}
                    `}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB HEADERS */}
          <div className="flex border-b border-cyan-500/20 bg-black/40">
            <button onClick={() => setActivePanelTab("PROBLEM")} className={`flex-1 p-4 font-mono text-xs font-bold tracking-widest transition-all ${activePanelTab === "PROBLEM" ? "bg-cyan-500/20 border-b-2 border-cyan-400 text-cyan-300" : "text-slate-500 hover:bg-white/5"}`}>
              <Code className="w-4 h-4 mx-auto mb-1" /> PROBLEM
            </button>
            <button onClick={() => setActivePanelTab("CHAT")} className={`flex-1 p-4 font-mono text-xs font-bold tracking-widest transition-all ${activePanelTab === "CHAT" ? "bg-cyan-500/20 border-b-2 border-cyan-400 text-cyan-300" : "text-slate-500 hover:bg-white/5"}`}>
              <MessageSquare className="w-4 h-4 mx-auto mb-1" /> CHAT
            </button>
          </div>

          {/* TAB CONTENT */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide flex flex-col">
            {activePanelTab === "PROBLEM" ? (
              <div className="border border-white/10 w-full rounded-lg p-5 bg-black/40 shadow-inner h-max">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                  <h3 className="font-mono text-sm text-cyan-400 flex items-center gap-2 uppercase tracking-wider">
                    <Code className="w-4 h-4" /> {activeProblem?.name || "Select Problem"}
                  </h3>
                  <span className={`text-[10px] tracking-widest px-2 py-0.5 rounded font-bold
                    ${activeProblem?.difficulty_level === 'HARD' ? 'bg-rose-500/20 text-rose-400' : activeProblem?.difficulty_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}
                  `}>
                    {activeProblem?.difficulty_level}
                  </span>
                </div>
                <div className="text-sm text-slate-300 leading-relaxed font-sans prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeProblem?.problem_definition || "No definition." }} />
                
                {/* TEST CASES SECTION */}
                {activeProblem?.test_cases && activeProblem.test_cases.length > 0 && (
                  <div className="mt-8">
                    <h4 className="font-mono text-cyan-500 font-bold text-sm tracking-widest mb-4 border-b border-cyan-500/20 pb-2">
                      PUBLIC EXAMPLES
                    </h4>
                    <div className="flex flex-col gap-4">
                      {activeProblem.test_cases.slice(0, 2).map((tc: any, index: number) => (
                        <div key={tc.id} className="bg-black/60 border border-white/5 rounded-lg p-4 font-mono text-xs shadow-inner">
                          <p className="text-slate-500 tracking-widest mb-2 font-bold">EXAMPLE {index + 1}</p>
                          <div className="mb-3">
                            <span className="text-cyan-600 block mb-1">Input:</span>
                            <pre className="text-slate-300 bg-black/40 p-2 rounded border border-white/5 whitespace-pre-wrap">{tc.input}</pre>
                          </div>
                          <div>
                            <span className="text-emerald-600 block mb-1">Expected Output:</span>
                            <pre className="text-emerald-400 bg-black/40 p-2 rounded border border-white/5 whitespace-pre-wrap">{tc.expectedOutput}</pre>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded text-center">
                      <p className="text-amber-500/80 font-mono text-xs tracking-widest font-bold">
                        TOTAL TEST CASES TO PASS: {activeProblem.test_cases.length}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-4">
                  {battleMessages.map(msg => (
                    <div key={msg.id} className={`px-3 py-2 rounded-xl max-w-[85%] font-mono text-sm ${msg.socketId === socket?.id ? 'bg-cyan-900/40 border border-cyan-500/30 text-cyan-100 self-end' : 'bg-slate-800/50 border border-slate-700 text-slate-300 self-start'}`}>
                      {msg.content}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleBattleMessage} className="mt-auto flex gap-2 pt-2 border-t border-cyan-500/20">
                  <input type="text" value={newBattleMessage} onChange={(e) => setNewBattleMessage(e.target.value)} placeholder="TRANSMIT..." className="flex-1 bg-black/50 border border-slate-700 p-3 rounded-lg text-white font-mono text-xs focus:border-cyan-500 focus:outline-none" />
                  <button type="submit" className="p-3 bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg transition-all"><Send className="w-4 h-4" /></button>
                </form>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-cyan-500/20 bg-black/20">
            <button
              onClick={handleRunCode}
              disabled={isSubmitting || battleState.status !== "IN_PROGRESS" || (localTimeRemaining === 0)}
              className="flex items-center justify-center w-full py-4 bg-cyan-900/40 hover:bg-cyan-600 border border-cyan-500/50 hover:border-cyan-400 text-cyan-100 font-mono text-sm font-bold tracking-[0.2em] rounded-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? <><Activity className="w-5 h-5 animate-pulse mr-2" /> [ EXECUTING... ]</> : "[ SUBMIT CODE ]"}
            </button>
          </div>
        </div>
        </div>

        <button onClick={() => setIsPanelOpen(!isPanelOpen)} className={`absolute top-1/2 -translate-y-1/2 z-30 bg-[#0b0c0e] border border-cyan-500/30 text-cyan-400 p-2 rounded-r-lg hover:bg-cyan-900/40 hover:text-cyan-300 transition-all shadow-[4px_0_15px_rgba(0,0,0,0.5)] left-full`}>
          {isPanelOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col h-full relative z-10 transition-all duration-300 min-w-0">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-50">
           {battleState.status === "WAITING" && (
             <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                <div className="bg-[#0a0b0e] border border-cyan-500/30 p-8 rounded-2xl shadow-2xl text-center pointer-events-auto max-w-sm">
                  <Lock className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white tracking-widest mb-2 font-mono">SYSTEM LOCKED</h3>
                  <p className="text-slate-400 text-sm font-sans mb-6">Editor will unlock when the host initiates the operation.</p>
                </div>
             </div>
           )}
           {localTimeRemaining === 0 && battleState.status === "IN_PROGRESS" && !battleResult && (
             <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                <div className="bg-[#0a0b0e] border border-rose-500/30 p-8 rounded-2xl shadow-2xl text-center pointer-events-auto max-w-sm">
                  <StopCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white tracking-widest mb-2 font-mono">TIME EXPIRED</h3>
                  <p className="text-slate-400 text-sm font-sans">You failed to crack this problem in time. Move to the next one.</p>
                </div>
             </div>
           )}
        </div>
        <MonacoIDE code={code} language={language} oid="battle-file" fileKey="battle" onCodeChange={handleCodeChange} handleRunCode={handleRunCode as any} isDisabled={countdown > 0 && countdown <= 10 && battleState.status === "IN_PROGRESS"} />
      </div>

      {battleResult && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center justify-center p-12 bg-[#0b0c0e] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full text-center relative overflow-hidden">
            <div className={`absolute top-0 w-full h-1 bg-gradient-to-r ${battleResult === "WON" ? "from-cyan-400 to-emerald-500" : "from-rose-500 to-orange-500"}`} />
            <div className="relative mb-6">
               <div className={`absolute inset-0 blur-xl ${battleResult === "WON" ? "bg-cyan-500/30" : "bg-rose-500/30"}`} />
               {battleResult === "WON" ? <Trophy className="w-16 h-16 text-cyan-400 relative z-10" /> : <Skull className="w-16 h-16 text-rose-500 relative z-10" />}
            </div>
            <h2 className={`font-mono text-3xl font-bold tracking-widest mb-3 ${battleResult === "WON" ? "text-cyan-400" : "text-rose-500"}`}>
              {battleResult === "WON" ? "OPERATION SUCCESSFUL" : "SYSTEM FAILURE"}
            </h2>
            <p className="text-slate-400 text-sm mb-8 font-sans">
              {battleResult === "WON" ? "You completed the operation." : "Time expired or opponent optimized faster."}
            </p>
            <button onClick={() => navigate("/")} className="w-full py-4 font-mono font-bold tracking-widest rounded-lg transition-all border border-cyan-500/50 bg-cyan-900/40 text-cyan-100 hover:bg-cyan-600">
              [ RETURN TO MAINFRAME ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Battle;
