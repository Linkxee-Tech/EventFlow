'use client';

import React from 'react';
import { logError } from '@/lib/logger';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  errorDigest?: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logError('ErrorBoundary', error, {
      componentStack: info.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[300px] flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-semibold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-slate-400 mb-5">
              This section failed to load. Your payment was not affected if you were checking out.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors mr-2"
            >
              Try again
            </button>
            <a
              href="/"
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors inline-block"
            >
              Go home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/** Lightweight section-level error boundary for dashboard widgets */
export function SectionErrorBoundary({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-center">
          <p className="text-xs text-red-400">Failed to load {label}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-slate-400 hover:text-white mt-2 transition-colors"
          >
            Refresh page
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
