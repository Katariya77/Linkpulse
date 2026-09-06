import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in LinkPulse:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-lg border border-zinc-800 bg-zinc-900/90 p-6 text-center space-y-4 shadow-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
              <AlertTriangle className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Application Encountered an Error</h2>
              <p className="text-xs text-zinc-400 mt-1">
                A component error occurred. Click below to reload and reset the session.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="rounded border border-zinc-800 bg-zinc-950 p-2.5 text-left font-mono text-[11px] text-zinc-400 overflow-x-auto">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center space-x-2 rounded bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-900 hover:bg-white transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
