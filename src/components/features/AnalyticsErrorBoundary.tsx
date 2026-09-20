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
          <div className="flex items-center justify-center p-8 border border-accent-danger/20 bg-accent-danger/5 rounded-lg">
            <div className="text-center">
              <p className="text-sm font-mono text-accent-danger mb-2">⚠️ Analytics Error</p>
              <p className="text-xs text-faint font-mono">Failed to load analytics. Please refresh the page.</p>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default AnalyticsErrorBoundary;
