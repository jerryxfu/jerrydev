import {Component, ErrorInfo, ReactNode} from "react";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {hasError: false};
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {hasError: true, error};
    }

    override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);

        // Error reporting service?
        if (import.meta.env.MODE === "production") {
        }
    }

    private handleRetry = () => {
        this.setState({hasError: false});
    };

    override render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div style={{
                    height: "100vh",
                    width: "100vw",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "2rem",
                    textAlign: "center"
                }}>
                    <div style={{
                        backgroundColor: "var(--error-bg, #ff6b6b)",
                        color: "var(--error-text, white)",
                        padding: "2rem",
                        borderRadius: "8px",
                        maxWidth: "600px"
                    }}>
                        <h1 style={{margin: "0 0 1rem 0"}}>Oops! Something went wrong</h1>
                        <p style={{margin: "0 0 1rem 0"}}>
                            The application encountered an unexpected error. This has been logged and will be investigated.
                        </p>
                        {process.env["NODE_ENV"] === "development" && this.state.error && (
                            <details style={{marginTop: "1rem", textAlign: "left"}}>
                                <summary style={{cursor: "pointer", marginBottom: "0.5rem"}}>
                                    Error Details (Development Only)
                                </summary>
                                <pre style={{
                                    backgroundColor: "rgba(0,0,0,0.2)",
                                    padding: "1rem",
                                    borderRadius: "4px",
                                    overflow: "auto",
                                    fontSize: "0.8rem"
                                }}>
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}
                        <button
                            onClick={this.handleRetry}
                            style={{
                                marginTop: "1rem",
                                padding: "0.5rem 1rem",
                                backgroundColor: "var(--primary-color, #007bff)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer"
                            }}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;