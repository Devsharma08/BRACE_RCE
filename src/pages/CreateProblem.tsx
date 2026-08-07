import React, { useState } from "react";
import { Plus, Trash2, Code2, Terminal, AlertCircle, CheckCircle2, Target, Lightbulb,Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../config/api";

const CreateProblem = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Basic Details
  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [definition, setDefinition] = useState("");
  const [hints, setHints] = useState<string[]>([""]);

  // Test Cases & Snippets
  const [testCases, setTestCases] = useState([{ input: "", expectedOutput: "", is_public: true }]);
  const [snippets, setSnippets] = useState([{ language: "javascript", code: "// Write your code here", wrapperCode: "" }]);

  const handleAddTestCase = () => setTestCases([...testCases, { input: "", expectedOutput: "", is_public: true }]);
  const handleRemoveTestCase = (index: number) => setTestCases(testCases.filter((_, i) => i !== index));

  const handleAddSnippet = () => setSnippets([...snippets, { language: "python", code: "# Write your code here", wrapperCode: "" }]);
  const handleRemoveSnippet = (index: number) => setSnippets(snippets.filter((_, i) => i !== index));

  const handleAddHint = () => setHints([...hints, ""]);
  const handleRemoveHint = (index: number) => setHints(hints.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/problems/create", {
        name,
        problem_definition: definition,
        problem_hints: hints.filter(h => h.trim() !== ""),
        difficulty_level: difficulty,
        test_cases: testCases,
        code_snippets: snippets
      });
      navigate("/lobby"); // We will build the lobby next!
    } catch (err) {
      console.error(err);
      setError("Failed to compile problem into the mainframe. Check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-300 p-8 pt-24 font-mono">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8 border-b border-cyan-500/20 pb-6">
          <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/30">
            <Code2 className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-widest">PROBLEM ARCHITECT</h1>
            <p className="text-sm text-cyan-500/60 tracking-widest mt-1">DESIGN CUSTOM COMBAT SCENARIOS</p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-lg flex items-center gap-3 mb-8">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm tracking-widest">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* SECTION 1: METADATA */}
          <div className="bg-[#0a0b0e] border border-slate-800 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              CORE DIRECTIVES
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs tracking-widest text-slate-500 mb-2">SCENARIO NAME</label>
                <input 
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-black/50 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none"
                  placeholder="e.g. Invert Binary Tree"
                />
              </div>
              <div>
                <label className="block text-xs tracking-widest text-slate-500 mb-2">THREAT LEVEL</label>
                <select 
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value)}
                  className="w-full bg-black/50 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none"
                >
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs tracking-widest text-slate-500 mb-2">PROBLEM DEFINITION (MARKDOWN SUPPORTED)</label>
              <textarea 
                required
                rows={5}
                value={definition}
                onChange={e => setDefinition(e.target.value)}
                className="w-full bg-black/50 border border-slate-800 rounded-lg p-4 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none font-sans"
                placeholder="Write your problem description here..."
              />
            </div>
          </div>

          {/* SECTION 2: TEST CASES */}
          <div className="bg-[#0a0b0e] border border-slate-800 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-rose-400" />
                EXECUTION PARAMETERS (TEST CASES)
              </h2>
              <button type="button" onClick={handleAddTestCase} className="text-xs bg-rose-500/10 text-rose-400 px-4 py-2 rounded-lg border border-rose-500/20 hover:bg-rose-500/20 transition-colors flex items-center gap-2 tracking-widest">
                <Plus className="w-3 h-3" /> ADD CASE
              </button>
            </div>

            <div className="space-y-6">
              {testCases.map((tc, idx) => (
                <div key={idx} className="bg-black/40 border border-slate-800 rounded-xl p-6 relative group">
                  <div className="absolute top-4 right-4 flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={!tc.is_public}
                        onChange={e => {
                          const newTc = [...testCases];
                          newTc[idx].is_public = !e.target.checked;
                          setTestCases(newTc);
                        }}
                        className="accent-rose-500"
                      />
                      <span className="text-xs text-rose-400 tracking-widest">HIDDEN EDGE CASE</span>
                    </label>
                    {testCases.length > 1 && (
                      <button type="button" onClick={() => handleRemoveTestCase(idx)} className="text-slate-600 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <h3 className="text-sm font-bold text-slate-400 tracking-widest mb-4">CASE 0{idx + 1}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs tracking-widest text-slate-500 mb-2">STDIN (INPUT)</label>
                      <textarea 
                        required
                        value={tc.input}
                        onChange={e => {
                          const newTc = [...testCases];
                          newTc[idx].input = e.target.value;
                          setTestCases(newTc);
                        }}
                        className="w-full bg-[#0a0b0e] border border-slate-800 rounded-lg p-3 text-cyan-400 focus:border-cyan-500 outline-none"
                        placeholder="[1, 2, 3]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs tracking-widest text-slate-500 mb-2">STDOUT (EXPECTED OUTPUT)</label>
                      <textarea 
                        required
                        value={tc.expectedOutput}
                        onChange={e => {
                          const newTc = [...testCases];
                          newTc[idx].expectedOutput = e.target.value;
                          setTestCases(newTc);
                        }}
                        className="w-full bg-[#0a0b0e] border border-slate-800 rounded-lg p-3 text-emerald-400 focus:border-emerald-500 outline-none"
                        placeholder="[3, 2, 1]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: CODE SNIPPETS & HINTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Snippets */}
            <div className="bg-[#0a0b0e] border border-slate-800 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-cyan-400" />
                  BOILERPLATE CODE
                </h2>
                <button type="button" onClick={handleAddSnippet} className="text-xs bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors">
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-6">
                {snippets.map((snippet, idx) => (
                  <div key={idx} className="bg-black/40 border border-slate-800 rounded-xl p-4 relative">
                    {snippets.length > 1 && (
                      <button type="button" onClick={() => handleRemoveSnippet(idx)} className="absolute top-4 right-4 text-slate-600 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <select 
                      value={snippet.language}
                      onChange={e => {
                        const newSnip = [...snippets];
                        newSnip[idx].language = e.target.value;
                        setSnippets(newSnip);
                      }}
                      className="bg-[#0a0b0e] border border-slate-800 rounded text-xs text-cyan-400 p-1 mb-3 outline-none"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                    </select>
                    <textarea 
                      required
                      value={snippet.code}
                      onChange={e => {
                        const newSnip = [...snippets];
                        newSnip[idx].code = e.target.value;
                        setSnippets(newSnip);
                      }}
                      className="w-full bg-[#050505] border border-slate-800 rounded-lg p-3 text-slate-300 font-mono text-sm outline-none focus:border-cyan-500"
                      rows={4}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Hints */}
            <div className="bg-[#0a0b0e] border border-slate-800 rounded-2xl p-8 shadow-2xl h-fit">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                  HINTS (OPTIONAL)
                </h2>
                <button type="button" onClick={handleAddHint} className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-4">
                {hints.map((hint, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400 shrink-0">
                      {idx + 1}
                    </div>
                    <input 
                      value={hint}
                      onChange={e => {
                        const newHints = [...hints];
                        newHints[idx] = e.target.value;
                        setHints(newHints);
                      }}
                      className="flex-1 bg-black/50 border border-slate-800 rounded-lg p-2 text-sm text-white focus:border-amber-500 outline-none"
                      placeholder="e.g. Try using a Hash Map..."
                    />
                    <button type="button" onClick={() => handleRemoveHint(idx)} className="text-slate-600 hover:text-rose-500 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex justify-end">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold tracking-widest px-8 py-4 rounded-xl flex items-center gap-3 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Activity className="w-5 h-5 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              {loading ? "COMPILING..." : "DEPLOY PROBLEM"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateProblem;
