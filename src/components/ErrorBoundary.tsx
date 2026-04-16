import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CryptoPulse] Render error:', error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="cyber-card border-red-500/60 max-w-lg w-full p-8 text-center space-y-6"
               style={{ borderColor: 'rgba(255, 0, 100, 0.5)', boxShadow: '0 0 20px rgba(255, 0, 100, 0.15)' }}>
            <div className="space-y-2">
              <h2 className="font-display text-3xl font-black text-red-400 tracking-widest uppercase"
                  style={{ textShadow: '0 0 10px rgba(255, 0, 100, 0.6), 2px 2px 0 rgba(255, 0, 100, 0.3), -2px -2px 0 rgba(0, 243, 255, 0.2)' }}>
                SYSTEM ERROR
              </h2>
              <div className="w-16 h-0.5 bg-red-500/50 mx-auto" />
            </div>

            <div className="bg-cyber-black/60 border border-gray-800 p-4">
              <p className="font-mono text-sm text-gray-400 break-all leading-relaxed">
                {this.state.error?.message || 'An unexpected error occurred in the neural interface.'}
              </p>
            </div>

            <button
              onClick={this.handleRestart}
              className="cyber-button danger font-display tracking-widest text-sm px-8 py-3 uppercase"
            >
              RESTART
            </button>

            <p className="text-[10px] font-mono text-gray-600 tracking-wider">
              ERR::RENDER_FAILURE // COMPONENT_TREE_CORRUPTED
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
