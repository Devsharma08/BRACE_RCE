import { Users, MessageSquare, Flag, HelpCircle, Activity, Server, Swords, Eye, Zap } from 'lucide-react';
import { api } from '../../config/api';
import { useSocket } from '../../context/SocketContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

const formatRelativeTime = (value?: string | null) => {
  if (!value) return "—";
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  return elapsedDays === 1 ? "Yesterday" : `${elapsedDays}d ago`;
};

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
    <div className={`w-12 h-12 rounded-none border border-subtle-line bg-surface-hover flex items-center justify-center mb-3 ${accent}`}>
      <Icon className="w-6 h-6" />
    </div>
    <span className="text-[10px] text-faint tracking-widest font-bold uppercase mb-1">{label}</span>
    <span className={`text-2xl font-extrabold ${accent}`}>{value}</span>
  </div>
);

const AdminDashboard = () => {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const { data: battlesData, isLoading: battlesLoading } = useQuery({
    queryKey: ['admin-active-battles'],
    queryFn: () => api.get('/admin/battles').then(r => r.data),
    refetchInterval: 10000,
  });

  const handleSpectate = (roomId: string) => {
    navigate(`/admin/battles/${roomId}/spectate`);
  };

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

        {/* Active Battles */}
        <div className="rounded-none border border-subtle-line bg-raised p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-fg tracking-widest uppercase flex items-center gap-2">
              <Swords className="w-5 h-5 text-accent-primary" />
              ACTIVE BATTLES
            </h2>
            <span className={`text-xs font-mono ${battlesLoading ? 'text-accent-warning' : 'text-accent-success'}`}>
              {battlesLoading ? 'REFRESHING...' : `${battlesData?.battles?.length || 0} LIVE`}
            </span>
          </div>
          {battlesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded border border-subtle-line bg-void animate-pulse" />
              ))}
            </div>
          ) : battlesData?.battles?.length === 0 ? (
            <div className="text-center py-8 text-faint font-mono text-xs">
              NO ACTIVE BATTLES
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {battlesData?.battles?.map((battle: any) => (
                <div
                  key={battle.id}
                  className="flex items-center justify-between p-3 rounded border border-subtle-line bg-surface hover:bg-raised transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${battle.status === 'IN_PROGRESS' ? 'bg-accent-success animate-pulse' : 'bg-accent-warning'}`} />
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-fg truncate">{battle.name || `Battle ${battle.roomCode}`}</div>
                      <div className="flex items-center gap-2 text-[10px] text-subtle">
                        <span className="font-mono">{battle.roomCode}</span>
                        <span>•</span>
                        <span>{battle.performances?.length || 0}/{battle.maxUsers} players</span>
                        <span>•</span>
                        <span>{formatRelativeTime(battle.createdAt)}</span>
                        {battle.status === 'IN_PROGRESS' && (
                          <span className="text-accent-success font-bold">LIVE</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSpectate(battle.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded border border-accent-primary/30 bg-accent-primary/10 text-accent-primary text-[10px] font-bold uppercase tracking-widest hover:bg-accent-primary/20 transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    SPECTATE
                  </button>
                </div>
              ))}
            </div>
          )}
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