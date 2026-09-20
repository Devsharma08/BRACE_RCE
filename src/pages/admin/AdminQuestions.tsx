import { useState } from 'react';
import { useAdminQuestions, useCreateQuestion, useUpdateQuestion, useDeleteQuestion, type AdminQuestion } from '../../hooks/useAdmin';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

const difficultyColors: Record<string, string> = {
  EASY: 'text-accent-success border-accent-success/30 bg-accent-success/10',
  MEDIUM: 'text-accent-warning border-accent-warning/30 bg-accent-warning/10',
  HARD: 'text-accent-danger border-accent-danger/30 bg-accent-danger/10',
};

interface QuestionForm {
  name: string;
  difficulty_level: 'EASY' | 'MEDIUM' | 'HARD';
  problem_definition: string;
  hints: string;
  timeLimitMs: number;
}

const AdminQuestions = () => {
  const { data: questions, isLoading, refetch } = useAdminQuestions();
  const createMut = useCreateQuestion();
  const updateMut = useUpdateQuestion();
  const deleteMut = useDeleteQuestion();
  const [isEditing, setIsEditing] = useState<AdminQuestion | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<QuestionForm>({
    name: '', difficulty_level: 'MEDIUM', problem_definition: '', hints: '', timeLimitMs: 600000,
  });

  const resetForm = () =>
    setForm({ name: '', difficulty_level: 'MEDIUM', problem_definition: '', hints: '', timeLimitMs: 600000 });

  const startEdit = (q: AdminQuestion) => {
    setForm({
      name: q.name,
      difficulty_level: q.difficulty_level,
      problem_definition: q.problem_definition,
      hints: q.problem_hints?.join('\n') || '',
      timeLimitMs: q.timeLimitMs || 600000,
    });
    setIsEditing(q);
    setIsCreating(false);
  };

  const startCreate = () => { resetForm(); setIsEditing(null); setIsCreating(true); };

  const cancelForm = () => { setIsEditing(null); setIsCreating(false); resetForm(); };

  const handleSubmit = async () => {
    if (!form.name || !form.problem_definition) {
      toast.error('Name and problem definition are required');
      return;
    }
    try {
      const payload = { ...form, hints: form.hints ? form.hints.split('\n').filter(Boolean) : [] };
      if (isEditing) {
        await updateMut.mutateAsync({ questionId: isEditing.id, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      await refetch();
      cancelForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save question');
    }
  };

  const handleDelete = async (q: AdminQuestion) => {
    const confirmed = window.confirm(`Delete question "${q.name}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await deleteMut.mutateAsync(q.id);
      await refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
    }
  };

  const isFormOpen = isEditing || isCreating;

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-subtle-line pb-4">
          <h1 className="text-2xl font-extrabold text-fg tracking-widest uppercase">QUESTION BANK</h1>
          {!isFormOpen && (
            <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 rounded-none border border-accent-primary/50 bg-accent-primary/10 hover:bg-accent-primary/15 text-accent-primary hover:text-fg font-bold text-xs tracking-widest">
              <Plus className="w-4 h-4" /> ADD QUESTION
            </button>
          )}
        </div>

        {/* Form */}
        {isFormOpen && (
          <div className="rounded-none border border-accent-primary/15 border-t-2 border-t-accent-primary/40 bg-raised p-5 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(var(--color-surface-hover)_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <h3 className="text-sm font-bold text-fg tracking-widest uppercase">
                {isEditing ? 'EDIT QUESTION' : 'NEW QUESTION'}
              </h3>
              <button onClick={cancelForm} className="p-1.5 rounded-none border border-subtle-line hover:border-accent-primary text-subtle hover:text-accent-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <input type="text" placeholder="Question Name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="px-3 py-2 rounded-none border border-subtle-line bg-base text-sm text-fg focus:outline-none focus:border-accent-primary" />
              <select value={form.difficulty_level}
                onChange={(e) => setForm({ ...form, difficulty_level: e.target.value as any })}
                className="px-3 py-2 rounded-none border border-subtle-line bg-base text-sm text-fg focus:outline-none focus:border-accent-primary font-bold">
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
              <input type="number" placeholder="Time Limit (ms)" value={form.timeLimitMs}
                onChange={(e) => setForm({ ...form, timeLimitMs: parseInt(e.target.value) || 0 })}
                className="px-3 py-2 rounded-none border border-subtle-line bg-base text-sm text-fg focus:outline-none focus:border-accent-primary" />
              <div className="md:col-span-2">
                <textarea placeholder="Problem Definition + Constraints" value={form.problem_definition}
                  onChange={(e) => setForm({ ...form, problem_definition: e.target.value })}
                  className="w-full px-3 py-2 rounded-none border border-subtle-line bg-base text-sm text-subtle resize-none focus:outline-none focus:border-accent-primary" rows={4} />
              </div>
              <div className="md:col-span-2">
                <textarea placeholder="Hints (one per line)" value={form.hints}
                  onChange={(e) => setForm({ ...form, hints: e.target.value })}
                  className="w-full px-3 py-2 rounded-none border border-subtle-line bg-base text-sm text-subtle resize-none focus:outline-none focus:border-accent-primary" rows={3} />
              </div>
            </div>
            <div className="mt-4 flex gap-2 relative z-10">
              <button onClick={handleSubmit} className="flex items-center gap-2 px-4 py-2 rounded-none border border-accent-success/40 bg-accent-success/10 hover:bg-accent-success/10 text-accent-success font-bold text-xs">
                <Save className="w-3.5 h-3.5" /> SAVE
              </button>
              <button onClick={cancelForm} className="flex items-center gap-2 px-4 py-2 rounded-none border border-subtle-line hover:border-accent-danger text-subtle hover:text-accent-danger font-bold text-xs">
                <X className="w-3.5 h-3.5" /> CANCEL
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-none border border-accent-primary/15 border-t-2 border-t-accent-primary/40 bg-raised overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(var(--color-surface-hover)_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="p-4 border-b border-subtle-line text-xs font-bold text-faint tracking-widest uppercase relative z-10">
            QUESTION DIRECTORY
          </div>
          <div className="overflow-y-auto relative z-10">
            {isLoading ? (
              <div className="p-8 text-center text-faint text-xs">LOADING PROBLEMS...</div>
            ) : !questions || questions.length === 0 ? (
              <div className="p-8 text-center text-faint text-xs">NO QUESTIONS FOUND</div>
            ) : (
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-subtle-line">
                    <th className="px-4 py-2 text-left text-faint">Name</th>
                    <th className="px-4 py-2 text-left text-faint">Difficulty</th>
                    <th className="px-4 py-2 text-left text-faint">TestCases</th>
                    <th className="px-4 py-2 text-left text-faint">Created</th>
                    <th className="px-4 py-2 text-right text-faint">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id} className="border-b border-subtle-line hover:bg-black/60">
                      <td className="px-4 py-3 text-fg font-bold">{q.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold border ${difficultyColors[q.difficulty_level]}`}>
                          {q.difficulty_level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-faint">{q.test_cases?.length || 0}</td>
                      <td className="px-4 py-3 text-faint">{new Date(q.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => startEdit(q)} className="p-1.5 rounded-none border border-accent-primary/40 bg-accent-primary/10 hover:bg-accent-primary/10 text-accent-primary">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(q)} className="p-1.5 rounded-none border border-accent-danger/40 bg-accent-danger/10 hover:bg-accent-danger/10 text-accent-danger">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminQuestions;
