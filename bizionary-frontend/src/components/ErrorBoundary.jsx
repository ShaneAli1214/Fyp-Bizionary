import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-textMain p-6">
          <div className="max-w-2xl w-full bg-surface/95 dark:bg-primary p-6 rounded-xl border border-surface/10 shadow-lg">
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-textMuted mb-4">An unexpected error occurred while rendering the application.</p>
            <details className="text-xs text-textMuted whitespace-pre-wrap max-h-40 overflow-auto">
              {this.state.error && this.state.error.toString()}
              {this.state.errorInfo && '\n' + (this.state.errorInfo.componentStack || '')}
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
