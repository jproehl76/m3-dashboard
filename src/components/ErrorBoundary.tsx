import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="rounded-xl border border-red-900 bg-red-950/30 p-6 text-sm text-red-400">
          <p className="font-semibold mb-1">Something went wrong in this panel.</p>
          <p className="font-mono text-xs text-red-600">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
