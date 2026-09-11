import { useState } from 'react';
import { useAdminReports, useActOnReport, type AdminReport } from '../../hooks/useAdmin';
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
      alert(err?.response?.data?.message || 'Failed to process report');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-white/10 pb-4">
          <h1 className="text-2xl font-extrabold text-white tracking-widest uppercase">
            QUESTION REPORTS
          </h1>
          <span className="text-xs text-slate-500 font-mono">
            {reports?.filter((r) => r.status === 'FLAGGED').length || 0} OPEN REPORTS
          </span>
        </div>

        {/* Reports Table */}
        <div className="rounded-none border border-white/20 border-r-4 border-b-4 border-r-rose-500/60 border-b-rose-500/60 bg-[#06080e] overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="p-4 border-b border-white/10 relative z-10">
            <span className="text-xs text-slate-500 font-bold tracking-widest uppercase">REPORT DIRECTORY</span>
          </div>

          <div className="overflow-y-auto relative z-10">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 text-xs">SCANNING REPORTS...</div>
            ) : !reports || reports.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">NO REPORTS FOUND</div>
            ) : (
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-2 text-left text-slate-500 tracking-widest uppercase">Question ID</th>
                    <th className="px-4 py-2 text-left text-slate-500 tracking-widest uppercase">Reported By</th>
                    <th className="px-4 py-2 text-left text-slate-500 tracking-widest uppercase">Reason</th>
                    <th className="px-4 py-2 text-left text-slate-500 tracking-widest uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-slate-500 tracking-widest uppercase">Created</th>
                    <th className="px-4 py-2 text-right text-slate-500 tracking-widest uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-black/40">
                      <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">{r.questionId.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-cyan-300">{r.reporter?.username || '—'}</td>
                      <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{r.reason}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-none text-[10px] font-bold border border-white/10 bg-white/5">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        {r.status === 'FLAGGED' && (
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => handleAction(r, 'DISMISSED')}
                              disabled={processingId === r.id}
                              className="p-1.5 rounded-none border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 hover:text-rose-200 disabled:opacity-50"
                              title="Dismiss"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleAction(r, 'APPROVED')}
                              disabled={processingId === r.id}
                              className="p-1.5 rounded-none border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 hover:text-emerald-200 disabled:opacity-50"
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