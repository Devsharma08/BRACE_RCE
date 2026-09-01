import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary for Analytics components
 * Gracefully handles rendering errors in analytics panels
 */
export class AnalyticsErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Analytics error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center p-8 border border-rose-500/20 bg-rose-950/10 rounded-lg">
            <div className="text-center">
              <p className="text-sm font-mono text-rose-400 mb-2">⚠️ Analytics Error</p>
              <p className="text-xs text-slate-500 font-mono">Failed to load analytics. Please refresh the page.</p>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default AnalyticsErrorBoundary;
