import { useState } from 'react';
import { useAdminFeedback, useResolveFeedback, type AdminFeedback } from '../../hooks/useAdmin';
import { toast } from 'sonner';
import { getInitialsAvatar } from '../../utils/avatar';

const statusOptions = [
  { value: 'PENDING', label: 'PENDING', color: 'text-accent-warning bg-accent-warning/10 border border-accent-warning/30' },
  { value: 'REVIEWED', label: 'REVIEWED', color: 'text-accent-primary bg-accent-primary/10 border border-accent-primary/30' },
  { value: 'RESOLVED', label: 'RESOLVED', color: 'text-accent-success bg-accent-success/10 border border-accent-success/30' },
];

const AdminFeedback = () => {
  const { data: feedback, isLoading, refetch } = useAdminFeedback();
  const resolveMutation = useResolveFeedback();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});

  const handleResolve = async (item: AdminFeedback, newStatus: string) => {
    setResolvingId(item.id);
    try {
      await resolveMutation.mutateAsync({
        id: item.id,
        status: newStatus,
        adminNote: noteInput[item.id] || undefined,
      });
      await refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update feedback');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6 relative z-10">
        <div className="flex items-center justify-between border-b-2 border-subtle-line pb-4">
          <h1 className="text-2xl font-extrabold text-fg tracking-widest uppercase">
            FEEDBACK CENTER
          </h1>
          <span className="text-xs text-faint font-mono">
            {(feedback || []).length} SUBMISSIONS RECEIVED
          </span>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-faint text-xs">LOADING FEEDBACK...</div>
          ) : !feedback || feedback.length === 0 ? (
            <div className="p-8 text-center text-faint text-xs border border-dashed border-subtle-line rounded-none bg-raised">
              NO FEEDBACK YET
            </div>
          ) : (
            feedback.map((item) => {
              const statusObj = statusOptions.find((s) => s.value === item.status) || statusOptions[0];
              return (
                <div
                  key={item.id}
                  className="rounded-none border border-accent-primary/15 border-t-2 border-t-accent-primary/40 bg-raised p-5 overflow-hidden"
                >
                  <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(var(--color-surface-hover)_1px,transparent_1px)] [background-size:16px_16px]" />

                  <div className="flex items-start justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.user.avatarUrl || getInitialsAvatar(item.user.username)}
                        alt={item.user.username}
                        className="w-8 h-8 rounded-none border border-accent-primary/40"
                      />
                      <div>
                        <span className="text-sm font-bold text-fg">{item.user.username}</span>
                        <span className="block text-xs text-faint">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-none text-[10px] font-bold tracking-widest ${statusObj.color}`}>
                      {statusObj.label}
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-subtle font-sans leading-relaxed relative z-10">
                    {item.content}
                  </p>

                  {item.adminNote && (
                    <div className="mt-3 p-3 rounded-none border border-accent-primary/30 bg-accent-primary/5">
                      <span className="text-[10px] text-accent-primary font-bold tracking-widest uppercase block mb-1">
                        ADMIN NOTE
                      </span>
                      <p className="text-xs text-subtle">{item.adminNote}</p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-3 relative z-10">
                    <textarea
                      placeholder="Internal note for this feedback..."
                      value={noteInput[item.id] || ''}
                      onChange={(e) => setNoteInput((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-none border border-subtle-line bg-base text-xs text-subtle placeholder:text-faint focus:outline-none focus:border-accent-primary resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      {statusOptions.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => handleResolve(item, s.value)}
                          disabled={resolvingId === item.id || item.status === s.value}
                          className={`px-3 py-2 rounded-none border font-bold text-xs tracking-widest transition-all disabled:opacity-50 ${
                            item.status === s.value
                              ? 'border-accent-primary text-accent-primary bg-accent-primary/10'
                              : 'border-subtle-line text-subtle hover:text-fg hover:border-subtle-line'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminFeedback;