import { StatusPill, type StatusTone } from "./StatusPill";

// ─── ConnectionIndicator ─────────────────────────────────────────────────────
// Realtime/connection health pill (Socket.io, sandbox, DB links).
export type ConnectionState = "online" | "connecting" | "offline";

const stateConfig: Record<ConnectionState, { tone: StatusTone; pulse: boolean; label: string }> = {
  online: { tone: "live", pulse: true, label: "ONLINE" },
  connecting: { tone: "warning", pulse: true, label: "CONNECTING" },
  offline: { tone: "danger", pulse: false, label: "OFFLINE" },
};

type ConnectionIndicatorProps = {
  state: ConnectionState;
  /** Channel name, e.g. "Socket", "Sandbox", "DB". */
  name?: string;
  className?: string;
};

export const ConnectionIndicator = ({ state, name = "Connection", className = "" }: ConnectionIndicatorProps) => {
  const config = stateConfig[state];
  return (
    <span role="status" aria-label={`${name}: ${config.label}`} className="inline-flex">
      <StatusPill tone={config.tone} pulse={config.pulse} className={className}>
        {name} {config.label}
      </StatusPill>
    </span>
  );
};