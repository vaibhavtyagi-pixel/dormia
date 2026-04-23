import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message ? String(error.message) : 'Unknown runtime error',
    };
  }

  componentDidCatch(error) {
    console.error('App render failed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-base px-4 text-center text-ink">
          <div className="card max-w-md p-6">
            <p className="font-sora text-lg font-semibold">Something failed while opening DORMIA</p>
            <p className="mt-2 text-sm text-text-secondary">
              Refresh once. If it persists, verify Firebase env variables in Vercel.
            </p>
            <p className="mt-3 rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs text-amber">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-full border border-border bg-indigo px-4 py-2 text-xs font-semibold text-white"
            >
              Reload
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

