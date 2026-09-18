import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
    fallback: ReactNode;
    children: ReactNode;
};

type ErrorBoundaryState = {
    error: Error | null;
};

/** Minimal error boundary, mainly to catch failed lazy chunk loads under Suspense. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("ErrorBoundary caught:", error, info.componentStack);
    }

    render() {
        return this.state.error ? this.props.fallback : this.props.children;
    }
}
