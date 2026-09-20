import { useState } from 'react';
import { useAdminReports, useActOnReport, type AdminReport } from '../../hooks/useAdmin';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';

const AdminReports = () => {
  const { data: reports, isLoading, refetch } = useAdminReports();
  const actOn = useActOnReport();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = async (report: AdminReport, status: 'DISMISSED' | 'APPROVED') => {
    const confirmed = window.confirm(
      status === 'APPROVED'
        ? `Approve and delete question "${report.questionId}"?`
        : `Dismiss report "${report.id}"?`
    );
    if (!confirmed) return;

    setProcessingId(report.id);
    try {
      await actOn.mutateAsync({ reportId: report.id, status });
      await refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to process report');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-subtle-line pb-4">
          <h1 className="text-2xl font-extrabold text-fg tracking-widest uppercase">
            QUESTION REPORTS
          </h1>
          <span className="text-xs text-faint font-mono">
            {reports?.filter((r) => r.status === 'FLAGGED').length || 0} OPEN REPORTS
          </span>
        </div>

        {/* Reports Table */}
        <div className="rounded-none border border-accent-primary/15 border-t-2 border-t-accent-danger/40 bg-raised overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(var(--color-surface-hover)_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="p-4 border-b border-subtle-line relative z-10">
            <span className="text-xs text-faint font-bold tracking-widest uppercase">REPORT DIRECTORY</span>
          </div>

          <div className="overflow-y-auto relative z-10">
            {isLoading ? (
              <div className="p-8 text-center text-faint text-xs">SCANNING REPORTS...</div>
            ) : !reports || reports.length === 0 ? (
              <div className="p-8 text-center text-faint text-xs">NO REPORTS FOUND</div>
            ) : (
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-subtle-line">
                    <th className="px-4 py-2 text-left text-faint tracking-widest uppercase">Question ID</th>
                    <th className="px-4 py-2 text-left text-faint tracking-widest uppercase">Reported By</th>
                    <th className="px-4 py-2 text-left text-faint tracking-widest uppercase">Reason</th>
                    <th className="px-4 py-2 text-left text-faint tracking-widest uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-faint tracking-widest uppercase">Created</th>
                    <th className="px-4 py-2 text-right text-faint tracking-widest uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b border-subtle-line hover:bg-black/60">
                      <td className="px-4 py-3 text-subtle font-mono text-[10px]">{r.questionId.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-accent-primary">{r.reporter?.username || '—'}</td>
                      <td className="px-4 py-3 text-subtle max-w-xs truncate">{r.reason}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-none text-[10px] font-bold border border-subtle-line bg-surface-hover">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-faint">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        {r.status === 'FLAGGED' && (
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => handleAction(r, 'DISMISSED')}
                              disabled={processingId === r.id}
                              className="p-1.5 rounded-none border border-accent-danger/40 bg-accent-danger/10 hover:bg-accent-danger/10 text-accent-danger hover:text-accent-danger disabled:opacity-50"
                              title="Dismiss"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleAction(r, 'APPROVED')}
                              disabled={processingId === r.id}
                              className="p-1.5 rounded-none border border-accent-success/40 bg-accent-success/10 hover:bg-accent-success/10 text-accent-success hover:text-accent-success disabled:opacity-50"
                              title="Approve & delete question"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
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

export default AdminReports;