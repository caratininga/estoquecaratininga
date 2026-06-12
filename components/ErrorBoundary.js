        class ErrorBoundary extends React.Component {
            constructor(props) {
                super(props);
                this.state = { hasError: false, error: null, errorInfo: null };
            }
            static getDerivedStateFromError(error) {
                return { hasError: true, error };
            }
            componentDidCatch(error, errorInfo) {
                this.setState({ errorInfo });
                console.error("ErrorBoundary caught an error:", error, errorInfo);
            }
            render() {
                if (this.state.hasError) {
                    return (
                        <div className="p-8 m-8 bg-red-100 text-red-900 border-2 border-red-500 rounded-lg shadow-xl">
                            <h2 className="text-2xl font-bold mb-4">🚨 Ocorreu um erro na aplicação!</h2>
                            <p className="font-semibold">{this.state.error && this.state.error.toString()}</p>
                            <pre className="mt-4 p-4 bg-white text-sm overflow-auto max-h-64 rounded">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>
                    );
                }
                return this.props.children; 
            }
        }

        // --- MAIN APP ---
window.ErrorBoundary = ErrorBoundary;
