import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      console.error('ErrorBoundary rendering fallback:', this.state.error);
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
          <div className="p-8 border border-red-500 rounded-lg">
            <h2 className="text-xl font-bold text-red-500 mb-4">Something went wrong</h2>
            <pre className="text-sm text-zinc-400">{this.state.error?.message}</pre>
            <button 
              className="mt-4 px-4 py-2 bg-red-600 rounded hover:bg-red-700"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}