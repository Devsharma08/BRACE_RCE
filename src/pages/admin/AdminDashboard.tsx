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
  <div className={`relative rounded-none border border-subtle-line bg-raised p-5 flex flex-col items-center text-center overflow-hidden ${borderClass}`}>
    <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(var(--color-surface-hover)_1px,transparent_1px)] [background-size:16px_16px]" />
    <div className={`w-12 h-12 rounded-none border border-subtle-line bg-black/60 flex items-center justify-center mb-3 ${accent}`}>
      <Icon className="w-6 h-6" />
    </div>
    <span className="text-[10px] text-faint tracking-widest font-bold uppercase mb-1">{label}</span>
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
        <div className="flex items-center justify-between border-b-2 border-subtle-line pb-4">
          <h1 className="text-2xl font-extrabold text-fg tracking-widest uppercase">
            ADMIN DASHBOARD
          </h1>
          <div className={`flex items-center gap-2 text-xs ${isConnected ? 'text-accent-success' : 'text-accent-danger'}`}>
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
            accent="text-accent-primary"
            borderClass="border-t-2 border-t-accent-primary/40"
          />
          <StatCard
            label="Pending Feedback"
            value={feedbackLoading ? '...' : (feedbackData?.feedback?.filter((f: any) => f.status === 'PENDING').length || 0)}
            icon={MessageSquare}
            accent="text-accent-warning"
            borderClass="border-t-2 border-t-accent-warning/40"
          />
          <StatCard
            label="Open Reports"
            value={reportsLoading ? '...' : (reportsData?.reports?.filter((r: any) => r.status === 'FLAGGED').length || 0)}
            icon={Flag}
            accent="text-accent-danger"
            borderClass="border-t-2 border-t-accent-danger/40"
          />
          <StatCard
            label="Total Questions"
            value={questionsLoading ? '...' : (questionsData?.questions?.length || 0)}
            icon={HelpCircle}
            accent="text-accent-primary"
            borderClass="border-t-2 border-t-accent-primary/40"
          />
        </div>

        {/* Status Bar */}
        <div className="rounded-none border border-subtle-line bg-raised p-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 text-subtle">
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3 text-accent-success" />
              API SERVER // HEALTHY
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-accent-primary animate-pulse" />
              RCE SANDBOX // ACTIVE
            </span>
          </div>
          <span className="text-faint">
            Socket ID: {socket?.id?.slice(0, 8) || 'disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;