import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
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
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

