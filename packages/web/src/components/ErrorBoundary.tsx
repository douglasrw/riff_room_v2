import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * FIXED M1: Error boundary to prevent full app crashes.
 * Catches React component errors and displays fallback UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });

    // Could send to error tracking service here (Sentry, etc.)
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-gray-900 text-white p-6">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center space-y-2">
              <div className="text-6xl">⚠️</div>
              <h1 className="text-2xl font-bold">Something went wrong</h1>
              <p className="text-gray-400">
                The application encountered an unexpected error.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="text-sm font-mono text-red-400">
                  {this.state.error.message}
                </div>
                {import.meta.env.DEV && this.state.errorInfo && (
                  <details className="text-xs text-gray-500">
                    <summary className="cursor-pointer hover:text-gray-400">
                      Stack trace
                    </summary>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded font-medium transition-colors"
              >
                Reload App
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition-colors"
              >
                Go Home
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              If this keeps happening, please report the issue.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
