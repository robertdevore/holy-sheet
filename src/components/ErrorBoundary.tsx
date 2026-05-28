import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[HolySheet] Unhandled render error:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: '40px',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            background: '#f6f3ea',
            color: '#2f3128',
          }}
        >
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Something went wrong</h1>
          <p style={{ fontSize: '14px', color: '#666a57', marginBottom: '24px', textAlign: 'center', maxWidth: '400px' }}>
            Holy Sheet encountered an unexpected error. Your data has not been lost.
          </p>
          {this.state.error && (
            <pre
              style={{
                fontSize: '12px',
                color: '#545a47',
                background: '#fcfaf4',
                border: '1px solid #d2c7af',
                borderRadius: '6px',
                padding: '12px',
                maxWidth: '500px',
                overflow: 'auto',
                marginBottom: '24px',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            style={{
              padding: '8px 20px',
              fontSize: '14px',
              background: '#fcfaf4',
              border: '1px solid #d2c7af',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#2f3128',
            }}
          >
            Reload Holy Sheet
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
