import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, Users, Zap, ShieldAlert, Trophy, X, Bell, BellOff, Volume2, VolumeX, Wifi, WifiOff, Activity } from "lucide-react";
import { api } from "../../config/api";
import { participantVerdict, verdictStyle } from "../../utils/participantVerdict";
import { useSocket } from "../../context/SocketContext";
import { SpectateNotificationCenter, useSpectateNotificationCenter } from "../../components/features/SpectateNotificationCenter";

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

const ParticipantVerdict = ({ participant, battleStatus }: { participant: any; battleStatus: string }) => {
  const verdict = participantVerdict(participant, battleStatus);
  return (
    <span className={`inline-block border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest rounded ${verdictStyle(verdict)}`}>
      {verdict}
    </span>
  );
};

interface BattleData {
  id: string;
  name: string;
  roomCode: string;
  status: string;
  hostId: string;
  isPublic: boolean;
  maxUsers: number;
  totalTimeLimitMs: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  host: { username: string; avatarUrl: string | null; id: string };
  problems: Array<{ id: string; name: string; difficulty_level: string; problem_number: number | null }>;
  performances: Array<{
    id: string;
    userId: string;
    status: string;
    score: number | null;
    user: { username: string; avatarUrl: string | null; id: string };
  }>;
}

const AdminSpectateView = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [muted, setMuted] = useState(() => {
    if (typeof window !== "undefined" && roomId) {
      return localStorage.getItem(`spectate-mute-${roomId}`) === "true";
    }
    return false;
  });
  const [livePerformances, setLivePerformances] = useState<Map<string, { progress: number; status: string; linesWritten: number }>>(new Map());
  const [socketJoined, setSocketJoined] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount, addEvent } = useSpectateNotificationCenter();

  const { data: battleData, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-battle-spectate", roomId],
    queryFn: () => api.get(`/admin/battles/${roomId}/spectate`).then(r => r.data),
    enabled: Boolean(roomId),
    refetchInterval: 5000,
  });

  const battle = battleData?.battle as BattleData | undefined;

  // Join socket room for real-time updates
  useEffect(() => {
    if (socket && isConnected && roomId && !socketJoined) {
      socket.emit("join_battle", roomId);
      setSocketJoined(true);

      // Listen for real-time battle updates
      const handleBattleUpdate = (data: any) => {
        // Update local performance data
        setLivePerformances(prev => {
          const next = new Map(prev);
          next.set(data.userId, {
            progress: data.progress ?? 0,
            status: data.status ?? "IN_PROGRESS",
            linesWritten: data.linesWritten ?? 0,
          });
          return next;
        });

        // Add to notification center if muted
        if (muted && data.status && (data.status.includes("PASSED") || data.status.includes("COMPLETED"))) {
          addEvent({
            type: "battle_update",
            roomId: roomId || "",
            roomName: battle?.name || `Battle ${battle?.roomCode || roomId}`,
            message: `Player ${data.userId.slice(0, 8)}: ${data.status} (${data.progress}%)`,
            data,
          });
        }
      };

      const handleBattleFinished = (data: any) => {
        if (muted) {
          addEvent({
            type: "battle_finished",
            roomId: roomId || "",
            roomName: battle?.name || `Battle ${battle?.roomCode || roomId}`,
            message: `Battle finished - Winner: ${data.winnerId?.slice(0, 8) || "unknown"}`,
            data,
          });
        }
        refetch();
      };

      socket.on("battle_update", handleBattleUpdate);
      socket.on("battle_finished", handleBattleFinished);

      return () => {
        socket.off("battle_update", handleBattleUpdate);
        socket.off("battle_finished", handleBattleFinished);
        if (roomId) {
          socket.emit("leave_room", roomId);
        }
      };
    }
  }, [socket, isConnected, roomId, socketJoined, muted, battle, addEvent]);

  const handleBack = () => {
    navigate("/admin");
  };

  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    if (roomId) {
      localStorage.setItem(`spectate-mute-${roomId}`, String(newMuted));
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary mx-auto mb-4" />
        <p className="text-faint font-mono text-xs">LOADING BATTLE DATA...</p>
      </div>
    );
  }

  if (error || !battle) {
    return (
      <div className="p-8 text-center">
        <X className="w-12 h-12 text-accent-danger mx-auto mb-4" />
        <p className="text-fg font-mono text-sm">BATTLE NOT FOUND</p>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 border border-subtle-line text-subtle hover:text-fg transition-colors font-mono text-xs uppercase tracking-widest"
        >
          BACK TO DASHBOARD
        </button>
      </div>
    );
  }

  const statusColors = {
    WAITING: "text-accent-warning",
    IN_PROGRESS: "text-accent-success",
    FINISHED: "text-accent-primary",
    LOCKED: "text-accent-danger",
  } as const;

  const getStatusColor = (status: string) => statusColors[status as keyof typeof statusColors] || "text-subtle";

  // Merge live socket data with fetched data
  const getMergedPerformances = () => {
    if (!battle) return [];
    return battle.performances.map(perf => {
      const live = livePerformances.get(perf.id);
      return {
        ...perf,
        progress: live?.progress ?? 0,
        liveStatus: live?.status,
        liveLinesWritten: live?.linesWritten ?? 0,
      };
    });
  };

  return (
    <>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-subtle-line pb-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded border border-subtle-line hover:bg-raised transition-colors"
            title="Back to Admin Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-subtle hover:text-fg" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-fg tracking-widest uppercase">
              SPECTATE: {battle.name || `Battle ${battle.roomCode}`}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-subtle">
              <span className="font-mono">ROOM: {battle.roomCode}</span>
              <span className={`font-bold ${getStatusColor(battle.status)}`}>{battle.status}</span>
              <span>•</span>
              <span>{battle.performances.length}/{battle.maxUsers} PLAYERS</span>
              <span>•</span>
              <span>HOST: {battle.host.username}</span>
              <span>•</span>
              <span>CREATED: {formatRelativeTime(battle.createdAt)}</span>
              {battle.totalTimeLimitMs && (
                <>
                  <span>•</span>
                  <span>DURATION: {Math.round(battle.totalTimeLimitMs / 60000)} MIN</span>
                </>
              )}
            </div>
          </div>
        </div>

        <Eye className="w-5 h-5 text-accent-primary/50" />
        <span className="text-accent-primary/50 font-mono text-xs uppercase tracking-widest">SPECTATOR MODE - READ ONLY</span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className={`p-2 rounded border transition-colors ${
              muted ? "border-accent-warning/50 bg-accent-warning/10 text-accent-warning" : "border-subtle-line hover:border-accent-primary/30"
            }`}
            title={muted ? "Unmute notifications" : "Mute notifications"}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded border transition-colors relative ${
              showNotifications ? "border-accent-primary bg-accent-primary/10" : "border-subtle-line hover:border-accent-primary/30"
            }`}
            title="Notification Center"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-danger text-[8px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Participants */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded border border-subtle-line bg-raised p-4">
            <h3 className="flex items-center gap-2 font-bold text-fg text-sm uppercase tracking-widest mb-4">
              <Users className="w-4 h-4 text-accent-primary" />
              PARTICIPANTS
            </h3>
            <div className="space-y-2">
              {getMergedPerformances().map((perf) => (
                <button
                  key={perf.id}
                  onClick={() => setSelectedParticipant(perf.id)}
                  className={`w-full text-left p-3 rounded border transition-all ${
                    selectedParticipant === perf.id
                      ? "border-accent-primary bg-accent-primary/10"
                      : "border-subtle-line hover:border-accent-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-fg">{perf.user.username}</span>
                    <span className={`text-[10px] font-bold ${getStatusColor(perf.liveStatus || perf.status)}`}>
                      {perf.liveStatus || perf.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-subtle">
                    <span>Score: {perf.score ?? 0}</span>
                    {perf.progress > 0 && (
                      <span className="text-accent-primary font-mono">{perf.progress}%</span>
                    )}
                    {perf.liveLinesWritten > 0 && (
                      <span className="text-faint">| {perf.liveLinesWritten} lines</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Battle Info */}
          <div className="rounded border border-subtle-line bg-raised p-4">
            <h3 className="font-bold text-fg text-sm uppercase tracking-widest mb-4">BATTLE INFO</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-subtle">STATUS</span>
                <span className={`font-mono ${getStatusColor(battle.status)}`}>{battle.status}</span>
              </div>
              {muted && (
                <div className="flex justify-between items-center p-1.5 rounded bg-accent-warning/10 border border-accent-warning/20">
                  <span className="flex items-center gap-1 text-accent-warning text-[9px] font-bold">
                    <VolumeX className="w-3 h-3" />
                    NOTIFICATIONS MUTED
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-subtle">MAX PLAYERS</span>
                <span className="font-mono">{battle.maxUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-subtle">PUBLIC</span>
                <span className="font-mono">{battle.isPublic ? "YES" : "NO"}</span>
              </div>
              {battle.totalTimeLimitMs && (
                <div className="flex justify-between">
                  <span className="text-subtle">TIME LIMIT</span>
                  <span className="font-mono">{Math.round(battle.totalTimeLimitMs / 60000)} MIN</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-subtle">STARTED</span>
                <span className="font-mono">{battle.startedAt ? formatRelativeTime(battle.startedAt) : "NOT STARTED"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-subtle">FINISHED</span>
                <span className="font-mono">{battle.finishedAt ? formatRelativeTime(battle.finishedAt) : "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Problems & Selected Participant */}
        <div className="lg:col-span-2 space-y-4">
          {/* Problems */}
          <div className="rounded border border-subtle-line bg-raised p-4">
            <h3 className="flex items-center gap-2 font-bold text-fg text-sm uppercase tracking-widest mb-4">
              <Zap className="w-4 h-4 text-accent-warning" />
              PROBLEMS ({battle.problems.length})
            </h3>
            <div className="space-y-2">
              {battle.problems.map((prob) => (
                <div
                  key={prob.id}
                  className="p-3 rounded border border-subtle-line bg-surface flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${
                      prob.difficulty_level === "EASY" ? "bg-green-500" :
                      prob.difficulty_level === "MEDIUM" ? "bg-yellow-500" : "bg-red-500"
                    }`} />
                    <div>
                      <div className="font-mono text-sm text-fg truncate">{prob.name}</div>
                      <div className="text-[10px] text-subtle font-bold uppercase">{prob.difficulty_level}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-faint font-mono">#{prob.problem_number || "?"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Participant Details */}
          {selectedParticipant && getMergedPerformances().find(p => p.id === selectedParticipant) && (
            <div className="rounded border border-accent-primary bg-accent-primary/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2 font-bold text-fg text-sm uppercase tracking-widest">
                  <ShieldAlert className="w-4 h-4 text-accent-primary" />
                  PARTICIPANT DETAILS
                </h3>
                <button
                  onClick={() => setSelectedParticipant(null)}
                  className="p-1 rounded hover:bg-accent-primary/20 transition-colors"
                >
                  <X className="w-4 h-4 text-subtle" />
                </button>
              </div>
              {(() => {
                const perf = getMergedPerformances().find(p => p.id === selectedParticipant)!;
                return (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-subtle">USERNAME</span>
                      <span className="font-mono text-fg">{perf.user.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle">STATUS</span>
                      <span className={`font-mono ${getStatusColor(perf.status)}`}>{perf.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-subtle">SCORE</span>
                      <span className="font-mono text-accent-primary">{perf.score ?? 0}</span>
                    </div>
                    <ParticipantVerdict participant={perf} battleStatus={battle.status} />
                  </div>
                );
              })()}
            </div>
          )}

          {/* No selection */}
          {!selectedParticipant && (
            <div className="rounded border border-subtle-line bg-raised p-8 text-center text-faint">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-mono text-sm uppercase tracking-widest">SELECT A PARTICIPANT</p>
              <p className="text-xs mt-2">Click on a participant to view their detailed progress and submissions</p>
            </div>
          )}
        </div>
      </div>
    </div>
    <SpectateNotificationCenter isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
};

export default AdminSpectateView;