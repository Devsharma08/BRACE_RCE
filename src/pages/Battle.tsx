import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/socketContext";
import MonacoIDE from "../features/terminal/components/MonacoIDE";
import type { SupportedLanguage } from "../features/terminal/types";
import { Code, Swords, User, Activity } from "lucide-react";

export const Battle = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  const [code, setCode] = useState<string>("// Your goal: Two Sum\n// Write your solution below!\n\nfunction twoSum(nums, target) {\n  \n}");
  const [language, setLanguage] = useState<SupportedLanguage>("javascript");
  
  // Opponent state
  const [opponentStatus, setOpponentStatus] = useState<string>("Coding...");
  const [opponentProgress, setOpponentProgress] = useState<number>(0);

  useEffect(() => {
    // If they land here without a socket connection, kick them to home

     const timeout = setTimeout(() => {
      if (!socket || !socket.connected) {
         navigate("/");
      }
    }, 1000); 


    if(socket){
        socket.emit("join_battle", roomId);

        socket.on('battle_update',(data)=>{
            if(data.status) setOpponentStatus(data.status);
            if(data.progress != undefined) setOpponentProgress(data.progress);
        })
    }
    // Listen for real-time updates from the opponent
    socket.on("battle_update", (data) => {
      if (data.status) setOpponentStatus(data.status);
      if (data.progress !== undefined) setOpponentProgress(data.progress);
    });

    return () => {
      clearTimeout(timeout);
      socket.off("battle_update");
    };
  }, [socket, navigate]);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    
    // Broadcast to the opponent that we are typing
    socket?.emit("battle_action", { roomId, status: "Typing..." });
  }, [socket, roomId]);

  const handleRunCode = async () => {
    // Tell the opponent we are running tests
    socket?.emit("battle_action", { roomId, status: "Running tests...", progress: 50 });
    
    // TODO: In the next step, we will wire this up to your Piston RCE execution API!
    // For now, simulate a win after 2 seconds
    const winningTimeout = setTimeout(() => {
       socket?.emit("battle_action", { roomId, status: "All Tests Passed! 🏆", progress: 100 });
       alert("You passed all tests!");
    }, 20000);

    return ()=>{
        clearTimeout(winningTimeout);
        socket.off('battle_action');
    }

  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#08090a] text-white overflow-hidden pt-16">
      
      {/* VS HEADER */}
      <div className="flex h-16 w-full items-center justify-between border-b border-white/10 bg-[#0b0c0e] px-6">
        <div className="flex items-center gap-3 text-cyan-400 w-1/3">
          <User className="h-5 w-5" />
          <span className="font-mono text-sm font-bold tracking-wider">YOU</span>
        </div>
        
        <div className="flex flex-col items-center w-1/3 justify-center">
          <Swords className="h-6 w-6 text-rose-500 mb-1" />
          <span className="font-mono text-[10px] text-slate-500">ROOM: {roomId}</span>
        </div>

        <div className="flex items-center justify-end gap-3 text-rose-400 w-1/3">
          <span className="font-mono text-xs font-bold tracking-wider truncate">{opponentStatus}</span>
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
        <div className="w-1/3 h-full bg-[#050505] p-6 flex flex-col gap-4">
           <div className="border border-white/10 rounded-lg p-5 bg-white/5">
              <h3 className="font-mono text-sm text-cyan-400 mb-3 flex items-center gap-2">
                 <Code className="w-4 h-4"/> PROBLEM: TWO SUM
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed font-sans mb-4">
                Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to target.
              </p>
              <div className="bg-black/50 rounded p-3 font-mono text-xs text-slate-300">
                 Input: nums = [2,7,11,15], target = 9<br/>
                 Output: [0,1]
              </div>
           </div>
           
           <button 
             onClick={handleRunCode}
             className="mt-auto w-full py-4 bg-cyan-900/40 hover:bg-cyan-600 border border-cyan-500/50 hover:border-cyan-400 text-cyan-100 font-mono font-bold tracking-widest rounded-lg transition-all"
           >
             [ SUBMIT BATTLE ]
           </button>
        </div>
      </div>
    </div>
  );
};

export default Battle;
