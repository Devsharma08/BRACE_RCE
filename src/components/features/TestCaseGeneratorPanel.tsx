import { useState } from "react";
import { Dices, Plus, Trash2, FlaskConical } from "lucide-react";
import { api } from "../../config/api";

/**
 * Problem Creator Studio additions (ROADMAP §2):
 * signature builder + one-click randomized test-case generation.
 */
export interface CreatorSignature {
  funcName: string;
  returnType: string;
  args: { name: string; type: string }[];
}

interface Props {
  signature: CreatorSignature;
  setSignature: (s: CreatorSignature) => void;
  onGenerated: (cases: { input: string; expectedOutput: string; is_public: boolean }[]) => void;
}

const ARG_TYPES = ["int", "long", "double", "boolean", "string", "char", "int[]", "string[]", "int[][]"];

export const TestCaseGeneratorPanel = ({ signature, setSignature, onGenerated }: Props) => {
  const [count, setCount] = useState(6);
  const [seed, setSeed] = useState(42);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateArg = (idx: number, patch: Partial<{ name: string; type: string }>) => {
    const args = signature.args.map((a, i) => (i === idx ? { ...a, ...patch } : a));
    setSignature({ ...signature, args });
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/roadmap/generate-tests", { signature, count, seed });
      onGenerated(res.data.testCases.map((c: any) => ({ input: c.input, expectedOutput: "", is_public: c.is_public })));
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to generate test cases");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-purple-500/20 rounded-xl p-4 bg-purple-950/10">
      <div className="flex items-center gap-2 mb-4">
        <FlaskConical className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-bold tracking-widest text-purple-300">SIGNATURE & AUTO TEST GENERATOR</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[10px] tracking-widest text-slate-500 mb-1">FUNCTION NAME</label>
          <input
            value={signature.funcName}
            onChange={(e) => setSignature({ ...signature, funcName: e.target.value })}
            className="w-full bg-black/50 border border-slate-800 rounded-lg p-2 text-white text-sm outline-none focus:border-purple-500 font-mono"
            placeholder="twoSum"
          />
        </div>
        <div>
          <label className="block text-[10px] tracking-widest text-slate-500 mb-1">RETURN TYPE</label>
          <input
            value={signature.returnType}
            onChange={(e) => setSignature({ ...signature, returnType: e.target.value })}
            className="w-full bg-black/50 border border-slate-800 rounded-lg p-2 text-white text-sm outline-none focus:border-purple-500 font-mono"
            placeholder="int[]"
          />
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {signature.args.map((arg, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              value={arg.name}
              onChange={(e) => updateArg(i, { name: e.target.value })}
              className="flex-1 bg-black/50 border border-slate-800 rounded-lg p-2 text-white text-sm outline-none focus:border-purple-500 font-mono"
              placeholder="param name"
            />
            <select
              value={arg.type}
              onChange={(e) => updateArg(i, { type: e.target.value })}
              className="bg-black/50 border border-slate-800 rounded-lg p-2 text-purple-300 text-sm outline-none"
            >
              {ARG_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSignature({ ...signature, args: signature.args.filter((_, idx) => idx !== i) })}
              className="text-slate-600 hover:text-rose-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSignature({ ...signature, args: [...signature.args, { name: `arg${signature.args.length + 1}`, type: "int" }] })}
          className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> ADD PARAMETER
        </button>
      </div>

      <div className="flex gap-2 items-end mb-3">
        <div>
          <label className="block text-[10px] tracking-widest text-slate-500 mb-1">COUNT</label>
          <input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))}
            className="w-20 bg-black/50 border border-slate-800 rounded-lg p-2 text-white text-sm outline-none" />
        </div>
        <div>
          <label className="block text-[10px] tracking-widest text-slate-500 mb-1">SEED</label>
          <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))}
            className="w-24 bg-black/50 border border-slate-800 rounded-lg p-2 text-white text-sm outline-none" />
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 bg-purple-500/20 hover:bg-purple-500 border border-purple-500/50 text-purple-300 hover:text-black font-bold tracking-widest py-2 rounded-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50 text-xs"
        >
          <Dices className="w-4 h-4" /> {loading ? "GENERATING…" : "AUTO-GENERATE TESTS"}
        </button>
      </div>
      {error && <p className="text-xs text-rose-400 font-mono">{error}</p>}
    </div>
  );
};
