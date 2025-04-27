'use client';

import { useEffect, useState, Component, ReactNode } from 'react';
import { isBrowser } from '@/lib/client-utils';

interface DynamicWrapperProps {
  children: React.ReactNode;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Simple error boundary component
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Uncaught error:", error, errorInfo);
    // Optionally log to an external service
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Log the error but render nothing to the user
      return null;
    }

    return this.props.children;
  }
}

function ErrorFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
  return (
    <div className="flex min-h-[300px] w-full flex-col items-center justify-center rounded-md bg-gray-50 p-4 text-center">
      <h2 className="mb-2 text-lg font-semibold text-red-600">Something went wrong</h2>
      <p className="mb-4 text-sm text-gray-600">
        The application encountered an unexpected error.
      </p>
      <button
        onClick={resetErrorBoundary}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}

export default function DynamicWrapper({ children }: DynamicWrapperProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [key, setKey] = useState(0);

  const resetErrorBoundary = () => {
    // Reset the error boundary by changing the key
    setKey(prev => prev + 1);
  };

  useEffect(() => {
    // Set mounted state
    setHasMounted(true);

    // Global error handler for common client-side errors
    if (isBrowser()) {
      const handleGlobalError = (event: ErrorEvent) => {
        // Prevent default browser error handling for certain types of errors
        if (
          event.message && (
            // Handle common mapping errors
            (event.message.includes('is not a function') && event.message.includes('map')) ||
            // Handle network errors during data fetching
            event.message.includes('Failed to fetch') ||
            // Handle JSON parse errors
            event.message.includes('JSON.parse') ||
            // Handle property access errors
            event.message.includes('Cannot read properties of')
          )
        ) {
          // Log but don't show error to user
          console.error('Handled client error:', event.message);
          event.preventDefault();
          return;
        }
      };

      // Add global error listener
      window.addEventListener('error', handleGlobalError);

      // Add unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        // Don't show a generic error for auth issues
        if (event.reason?.message?.includes('auth') || 
            event.reason?.message?.includes('unauthorized') ||
            event.reason?.message?.includes('not found')) {
          event.preventDefault();
        }
      });

      return () => {
        window.removeEventListener('error', handleGlobalError);
        window.removeEventListener('unhandledrejection', () => {});
      };
    }
  }, []);

  if (!hasMounted) {
    // Return a loading state or empty div when server-side rendering
    return <div className="dynamic-wrapper-loading"></div>;
  }

  return (
    <ErrorBoundary 
      key={key}
      fallback={<ErrorFallback resetErrorBoundary={resetErrorBoundary} />}
    >
      {children}
    </ErrorBoundary>
  );
}
