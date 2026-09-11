import { useQuery } from '@tanstack/react-query';
import { Users, MessageSquare, Flag, HelpCircle, Activity, Server } from 'lucide-react';
import { api } from '../../config/api';
import { useSocket } from '../../context/SocketContext';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  borderClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, accent, borderClass }) => (
  <div className={`relative rounded-none border border-white/20 bg-[#06080e] p-5 flex flex-col items-center text-center overflow-hidden ${borderClass}`}>
    <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]" />
    <div className={`w-12 h-12 rounded-none border border-white/10 bg-black/40 flex items-center justify-center mb-3 ${accent}`}>
      <Icon className="w-6 h-6" />
    </div>
    <span className="text-[10px] text-slate-500 tracking-widest font-bold uppercase mb-1">{label}</span>
    <span className={`text-2xl font-extrabold ${accent}`}>{value}</span>
  </div>
);

const AdminDashboard = () => {
  const { socket, isConnected } = useSocket();

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-stats-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  });

  const { data: feedbackData, isLoading: feedbackLoading } = useQuery({
    queryKey: ['admin-stats-feedback'],
    queryFn: () => api.get('/admin/feedback').then(r => r.data),
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['admin-stats-reports'],
    queryFn: () => api.get('/admin/reports').then(r => r.data),
  });

  const { data: questionsData, isLoading: questionsLoading } = useQuery({
    queryKey: ['admin-stats-questions'],
    queryFn: () => api.get('/admin/questions').then(r => r.data),
  });

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-white/10 pb-4">
          <h1 className="text-2xl font-extrabold text-white tracking-widest uppercase">
            ADMIN DASHBOARD
          </h1>
          <div className={`flex items-center gap-2 text-xs ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
            <Activity className="w-3 h-3" />
            <span>{isConnected ? 'SOCKET ONLINE' : 'SOCKET OFFLINE'}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Users"
            value={usersLoading ? '...' : (usersData?.users?.length || 0)}
            icon={Users}
            accent="text-cyan-400"
            borderClass="border-r-4 border-b-4 border-r-cyan-500/60 border-b-cyan-500/60"
          />
          <StatCard
            label="Pending Feedback"
            value={feedbackLoading ? '...' : (feedbackData?.feedback?.filter((f: any) => f.status === 'PENDING').length || 0)}
            icon={MessageSquare}
            accent="text-amber-400"
            borderClass="border-l-4 border-b-4 border-l-amber-500/60 border-b-amber-500/60"
          />
          <StatCard
            label="Open Reports"
            value={reportsLoading ? '...' : (reportsData?.reports?.filter((r: any) => r.status === 'FLAGGED').length || 0)}
            icon={Flag}
            accent="text-rose-400"
            borderClass="border-t-4 border-r-4 border-t-rose-500/60 border-r-rose-500/60"
          />
          <StatCard
            label="Total Questions"
            value={questionsLoading ? '...' : (questionsData?.questions?.length || 0)}
            icon={HelpCircle}
            accent="text-purple-400"
            borderClass="border-t-4 border-l-4 border-t-purple-500/60 border-l-purple-500/60"
          />
        </div>

        {/* Status Bar */}
        <div className="rounded-none border border-white/10 bg-[#06080e] p-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3 text-emerald-400" />
              API SERVER // HEALTHY
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
              RCE SANDBOX // ACTIVE
            </span>
          </div>
          <span className="text-slate-500">
            Socket ID: {socket?.id?.slice(0, 8) || 'disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;