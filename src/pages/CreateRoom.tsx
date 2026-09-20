import React, { useState, useEffect } from "react";
import { ShieldAlert, CheckCircle2, Lock, Unlock, Globe, EyeOff, Swords, Activity, Plus, Terminal, Code2, Lightbulb, Trash2, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../config/api";
import { invalidateProblemQueries } from "../utils/problemCache";
import { toast } from "sonner";
import { TestCaseGeneratorPanel, type CreatorSignature } from "../components/features/TestCaseGeneratorPanel";

interface Problem {
  id: string;
  name: string;
  difficulty_level: string;
  isCustom: boolean;
}

const CreateRoom = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // --- ROOM STATE ---
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [maxUsers, setMaxUsers] = useState<number>(2);
  const [isPublic, setIsPublic] = useState(true);
  const [totalTimeLimitMinutes, setTotalTimeLimitMinutes] = useState<number>(45);
  

  const [selectedProblemIds, setSelectedProblemIds] = useState<string[]>([]);

  // --- SIGNATURE BUILDER STATE (ROADMAP §2) ---
  const [creatorSignature, setCreatorSignature] = useState<CreatorSignature>({
    funcName: "solve",
    returnType: "int",
    args: [{ name: "nums", type: "int[]" }],
  });

  // --- PROBLEM TAB STATE ---
  const [activeProblemTab, setActiveProblemTab] = useState<"EXISTING" | "CUSTOM">("EXISTING");

  // --- CUSTOM PROBLEM STATE ---
  const [customLoading, setCustomLoading] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDifficulty, setCustomDifficulty] = useState("MEDIUM");
  const [customDefinition, setCustomDefinition] = useState("");
  const [customHints, setCustomHints] = useState<string[]>([""]);
  const [customTestCases, setCustomTestCases] = useState([{ input: "", expectedOutput: "", is_public: true }]);
  const [customSnippets, setCustomSnippets] = useState([{ language: "javascript", code: "// Write your code here", wrapperCode: "" }]);

  const queryClient = useQueryClient();

  const { data: availableProblems = [] } = useQuery({
    queryKey: ["all-available-problems"],
    // Static problem definitions — see invalidateProblemQueries() for the
    // progress-driven refreshes.
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const [sysRes, customRes] = await Promise.all([
        api.get("/problems/system"),
        api.get("/problems/custom")
      ]);
      return [...sysRes.data.problems, ...customRes.data.problems];
    },
  });

  // Auto-calculate the Global Time Limit whenever problems are selected
  useEffect(() => {
    let calculatedMinutes = 0;
    
    selectedProblemIds.forEach(id => {
      const p = availableProblems.find(prob => prob.id === id);
      if (p) {
        if (p.difficulty_level === "HARD") calculatedMinutes += 30;
        else if (p.difficulty_level === "MEDIUM") calculatedMinutes += 20;
        else calculatedMinutes += 15;
      }
    });
    
    if (calculatedMinutes > 0) {
      calculatedMinutes += 5;
    } else {
      calculatedMinutes = 0;
    }

    setTotalTimeLimitMinutes(calculatedMinutes);
  }, [selectedProblemIds, availableProblems]);

  const toggleProblemSelection = (id: string) => {
    setSelectedProblemIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProblemIds.length === 0) return toast.error("You must select at least one problem!");

    setLoading(true);
    try {
      const res = await api.post("/rooms/create", {
        name,
        description,
        password: password || null,
        maxUsers,
        isPublic,
        isTemplate: false,
        problemIds: selectedProblemIds,
        totalTimeLimitMs: totalTimeLimitMinutes * 60 * 1000
      });
      navigate(`/battle/${res.data.room.roomCode}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to initialize room.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomProblem = async () => {
    if (!customName || !customDefinition) return toast.error("Please fill out the problem name and definition.");
    setCustomLoading(true);
    try {
      const res = await api.post("/problems/create", {
        name: customName,
        problem_definition: customDefinition,
        problem_hints: customHints.filter(h => h.trim() !== ""),
        difficulty_level: customDifficulty,
        test_cases: customTestCases,
        code_snippets: customSnippets
      });
      
      const newProb = res.data.problem;
      
      // Refetch available problems query
      invalidateProblemQueries(queryClient);
      
      // Auto-select it in the queue
      setSelectedProblemIds(prev => [...prev, newProb.id]);
      
      // Reset form
      setCustomName("");
      setCustomDefinition("");
      setCustomHints([""]);
      setCustomTestCases([{ input: "", expectedOutput: "", is_public: true }]);
      setCustomSnippets([{ language: "javascript", code: "// Write your code here", wrapperCode: "" }]);
      
      // Switch back to EXISTING tab
      setActiveProblemTab("EXISTING");
      
    } catch (err) {
      console.error(err);
      toast.error("Failed to create custom problem.");
    } finally {
      setCustomLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void text-fg px-4 py-8 pt-20 sm:pt-24 pb-32 font-mono relative">
      <div className="max-w-6xl mx-auto relative z-10">
        
        <div className="mb-8 sm:mb-10 text-center">
          <h1 className="text-2xl sm:text-4xl font-bold text-fg tracking-widest mb-2 flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            <ShieldAlert className="w-7 h-7 sm:w-8 h-8 text-accent-primary shrink-0" />
            <span>OPERATION DEPLOYMENT</span>
          </h1>
          <p className="text-accent-primary/60 tracking-widest text-xs sm:text-sm">
            CONFIGURE PARAMETERS AND ASSEMBLE MISSION QUEUE
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: ROOM SETTINGS */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-raised border border-subtle-line rounded-2xl p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-fg mb-6 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-accent-primary" />
                SECURITY & COMMS
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs tracking-widest text-faint mb-2">ROOM DESIGNATION</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-raised border border-subtle-line rounded-lg p-3 text-fg focus:border-accent-primary outline-none" placeholder="e.g. Weekly Code Clash" />
                </div>

                <div>
                  <label className="block text-xs tracking-widest text-faint mb-2">MISSION BRIEFING (OPTIONAL)</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-raised border border-subtle-line rounded-lg p-3 text-fg focus:border-accent-primary outline-none font-sans" placeholder="Describe the room..." />
                </div>

                <div>
                  <label className="block text-xs tracking-widest text-faint mb-2">ACCESS PASSWORD (OPTIONAL)</label>
                  <div className="relative">
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-raised border border-subtle-line rounded-lg p-3 pl-10 text-fg focus:border-accent-primary outline-none" placeholder="Leave blank for open access" />
                    <Lock className="w-4 h-4 text-faint absolute left-3 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs tracking-widest text-faint mb-2">MAX OPERATIVES</label>
                  <input type="number" min={2} max={10} value={maxUsers} onChange={e => setMaxUsers(Number(e.target.value))} className="w-full bg-raised border border-subtle-line rounded-lg p-3 text-fg focus:border-accent-primary outline-none" />
                </div>

                <div>
                  <label className="block text-xs tracking-widest text-faint mb-2">GLOBAL TIME LIMIT (MINUTES)</label>
                  <input 
                    type="number" 
                    min={5} 
                    max={180} 
                    value={totalTimeLimitMinutes} 
                    onChange={e => setTotalTimeLimitMinutes(Number(e.target.value))} 
                    className="w-full bg-raised border border-subtle-line rounded-lg p-3 text-fg focus:border-accent-primary outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-raised border border-subtle-line rounded-2xl p-6 shadow-2xl space-y-4">
              <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl border border-subtle-line hover:border-accent-primary/50 transition-colors bg-raised">
                <div className="flex items-center gap-3">
                  {isPublic ? <Globe className="w-5 h-5 text-accent-success" /> : <EyeOff className="w-5 h-5 text-accent-danger" />}
                  <div>
                    <p className="text-fg text-sm font-bold tracking-widest">PUBLIC LOBBY</p>
                    <p className="text-xs text-faint">Visible to all operatives</p>
                  </div>
                </div>
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="w-5 h-5 accent-[var(--accent-primary)]" />
              </label>
            </div>
          </div>

          {/* RIGHT: PROBLEM PLAYLIST & CREATION */}
          <div className="lg:col-span-2">
            <div className="bg-raised border border-subtle-line rounded-2xl flex flex-col h-full max-h-[800px]">
              
              <div className="p-4 border-b border-subtle-line bg-accent-primary/10 flex items-center justify-between">
                <div className="flex gap-4">
                  <button 
                    onClick={() => setActiveProblemTab("EXISTING")}
                    className={`text-sm font-bold tracking-widest transition-colors ${activeProblemTab === "EXISTING" ? "text-accent-primary border-b-2 border-accent-primary pb-1" : "text-faint hover:text-fg pb-1"}`}
                  >
                    MISSION QUEUE
                  </button>
                  <button 
                    onClick={() => setActiveProblemTab("CUSTOM")}
                    className={`text-sm font-bold tracking-widest transition-colors ${activeProblemTab === "CUSTOM" ? "text-accent-primary border-b-2 border-accent-primary pb-1" : "text-faint hover:text-fg pb-1"}`}
                  >
                    + NEW CUSTOM PROBLEM
                  </button>
                </div>
                {activeProblemTab === "EXISTING" && (
                  <span className="text-xs text-accent-primary font-bold tracking-widest bg-accent-primary/10 px-3 py-1 rounded-full border border-subtle-line">
                    {selectedProblemIds.length} SELECTED
                  </span>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-3">
                
                {/* TAB: EXISTING PROBLEMS */}
                {activeProblemTab === "EXISTING" && (
                  availableProblems.map((prob) => {
                    const isSelected = selectedProblemIds.includes(prob.id);
                    const isHard = prob.difficulty_level === "HARD";
                    const isMed = prob.difficulty_level === "MEDIUM";
                    
                    return (
                      <div 
                        key={prob.id}
                        onClick={() => toggleProblemSelection(prob.id)}
                        className={`cursor-pointer flex items-center justify-between p-4 rounded-xl border transition-all
                          ${isSelected ? "bg-accent-primary/10 border-accent-primary" : "bg-raised border-subtle-line hover:border-accent-primary/50"}
                        `}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center
                            ${isSelected ? "bg-accent-primary border-accent-primary text-ink" : "border-subtle-line"}
                          `}>
                            {isSelected && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className={`font-bold tracking-wider text-sm ${isSelected ? "text-accent-primary" : "text-fg"}`}>
                              {prob.name}
                            </p>
                            {prob.isCustom && (
                              <span className="text-[10px] bg-accent-primary/20 text-accent-primary px-2 py-0.5 rounded uppercase tracking-widest mt-1 inline-block">
                                Custom Problem
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-bold tracking-widest
                          ${isHard ? "text-accent-danger" : isMed ? "text-accent-warning" : "text-accent-success"}
                        `}>
                          {prob.difficulty_level}
                        </span>
                      </div>
                    );
                  })
                )}

                {/* TAB: CREATE CUSTOM PROBLEM */}
                {activeProblemTab === "CUSTOM" && (
                  <div className="space-y-8 pb-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs tracking-widest text-faint mb-2">SCENARIO NAME</label>
                        <input value={customName} onChange={e => setCustomName(e.target.value)} className="w-full bg-raised border border-subtle-line rounded-lg p-3 text-fg focus:border-accent-primary outline-none" placeholder="e.g. Invert Binary Tree" />
                      </div>
                      <div>
                        <label className="block text-xs tracking-widest text-faint mb-2">THREAT LEVEL</label>
                        <select value={customDifficulty} onChange={e => setCustomDifficulty(e.target.value)} className="w-full bg-raised border border-subtle-line rounded-lg p-3 text-fg focus:border-accent-primary outline-none">
                          <option value="EASY">EASY (15 min)</option>
                          <option value="MEDIUM">MEDIUM (20 min)</option>
                          <option value="HARD">HARD (30 min)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs tracking-widest text-faint mb-2">PROBLEM DEFINITION (MARKDOWN)</label>
                      <textarea rows={4} value={customDefinition} onChange={e => setCustomDefinition(e.target.value)} className="w-full bg-raised border border-subtle-line rounded-lg p-4 text-fg focus:border-accent-primary outline-none font-sans" placeholder="Write your problem description here..." />
                    </div>

                    {/* HINTS */}
                    <div className="border border-subtle-line rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-xs font-bold tracking-widest text-faint flex items-center gap-2"><Lightbulb className="w-4 h-4 text-accent-warning" /> HINTS</label>
                        <button type="button" onClick={() => setCustomHints([...customHints, ""])} className="text-xs text-accent-warning hover:text-accent-warning flex items-center gap-1"><Plus className="w-3 h-3" /> ADD</button>
                      </div>
                      <div className="space-y-3">
                        {customHints.map((hint, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input value={hint} onChange={e => { const h = [...customHints]; h[i] = e.target.value; setCustomHints(h); }} className="flex-1 bg-raised border border-subtle-line rounded-lg p-2 text-sm text-fg focus:border-accent-warning outline-none" placeholder="Hint text..." />
                            <button onClick={() => setCustomHints(customHints.filter((_, idx) => idx !== i))} className="text-faint hover:text-accent-danger"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* TEST CASES */}
                    <TestCaseGeneratorPanel
                      signature={creatorSignature}
                      setSignature={setCreatorSignature}
                      onGenerated={(generated) => setCustomTestCases(generated)}
                    />
                    <div className="border border-subtle-line rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-xs font-bold tracking-widest text-faint flex items-center gap-2"><Terminal className="w-4 h-4 text-accent-danger" /> TEST CASES</label>
                        <button type="button" onClick={() => setCustomTestCases([...customTestCases, { input: "", expectedOutput: "", is_public: true }])} className="text-xs text-accent-danger hover:text-accent-danger flex items-center gap-1"><Plus className="w-3 h-3" /> ADD</button>
                      </div>
                      <div className="space-y-4">
                        {customTestCases.map((tc, i) => (
                          <div key={i} className="bg-raised p-3 rounded-lg border border-subtle-line relative group">
                            <button onClick={() => setCustomTestCases(customTestCases.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 text-faint hover:text-accent-danger"><Trash2 className="w-4 h-4" /></button>
                            <label className="flex items-center gap-2 mb-3">
                              <input type="checkbox" checked={!tc.is_public} onChange={e => { const t = [...customTestCases]; t[i].is_public = !e.target.checked; setCustomTestCases(t); }} className="accent-[var(--accent-danger)]" />
                              <span className="text-xs text-accent-danger">HIDDEN EDGE CASE</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              <input value={tc.input} onChange={e => { const t = [...customTestCases]; t[i].input = e.target.value; setCustomTestCases(t); }} className="bg-raised border border-subtle-line rounded p-2 text-accent-primary outline-none text-sm" placeholder="Input" />
                              <input value={tc.expectedOutput} onChange={e => { const t = [...customTestCases]; t[i].expectedOutput = e.target.value; setCustomTestCases(t); }} className="bg-raised border border-subtle-line rounded p-2 text-accent-success outline-none text-sm" placeholder="Expected Output" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SNIPPETS */}
                    <div className="border border-subtle-line rounded-xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-xs font-bold tracking-widest text-faint flex items-center gap-2"><Code2 className="w-4 h-4 text-accent-primary" /> SNIPPETS</label>
                        <button type="button" onClick={() => setCustomSnippets([...customSnippets, { language: "python", code: "", wrapperCode: "" }])} className="text-xs text-accent-primary hover:text-accent-primary flex items-center gap-1"><Plus className="w-3 h-3" /> ADD</button>
                      </div>
                      <div className="space-y-4">
                        {customSnippets.map((snip, i) => (
                          <div key={i} className="bg-raised p-3 rounded-lg border border-subtle-line relative">
                            <button onClick={() => setCustomSnippets(customSnippets.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 text-faint hover:text-accent-danger"><Trash2 className="w-4 h-4" /></button>
                            <select value={snip.language} onChange={e => { const s = [...customSnippets]; s[i].language = e.target.value; setCustomSnippets(s); }} className="bg-raised border border-subtle-line rounded text-xs text-accent-primary p-1 mb-2 outline-none">
                              <option value="javascript">JavaScript</option>
                              <option value="python">Python</option>
                              <option value="java">Java</option>
                              <option value="cpp">C++</option>
                            </select>
                            <textarea rows={3} value={snip.code} onChange={e => { const s = [...customSnippets]; s[i].code = e.target.value; setCustomSnippets(s); }} className="w-full bg-void border border-subtle-line rounded p-2 text-fg font-mono text-sm outline-none focus:border-accent-primary" placeholder="Starter code..." />
                          </div>
                        ))}
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={handleCreateCustomProblem}
                      disabled={customLoading}
                      className="w-full bg-accent-primary/10 hover:bg-accent-primary border border-accent-primary/50 text-accent-primary hover:text-ink font-bold tracking-widest py-4 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50 mt-8"
                    >
                      {customLoading ? <Activity className="w-5 h-5 animate-pulse" /> : <Target className="w-5 h-5" />}
                      CREATE & ADD TO QUEUE
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-subtle-line pt-6">
          <div className="w-full sm:w-auto">
             <button 
                onClick={handleCreateRoom}
                disabled={loading || selectedProblemIds.length === 0}
                className="w-full rounded-btn bg-accent-primary px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-ink shadow-glow-accent transition-all hover:opacity-90 disabled:opacity-50 sm:w-auto sm:text-sm"
              >
                {loading ? <Activity className="w-4 h-4 animate-pulse" /> : <Swords className="w-4 h-4" />}
                INITIALIZE OPERATION
              </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CreateRoom;
