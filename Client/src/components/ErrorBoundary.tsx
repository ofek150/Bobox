import { Component, ErrorInfo, ReactNode } from 'react';
import { Home, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

/**
 * Catches render-time crashes (broken page chunks, unexpected data shapes)
 * so the user sees a friendly recovery card instead of a blank white page.
 */
class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div className="flex flex-1 items-center justify-center px-4 py-16">
                <div className="flex max-w-sm flex-col items-center gap-3 text-center">
                    <RefreshCw className="size-12 text-muted-foreground/60" />
                    <h1 className="text-2xl font-bold">Something broke</h1>
                    <p className="text-muted-foreground">
                        An unexpected error happened. Reloading usually fixes it —
                        your files are safe.
                    </p>
                    <div className="mt-2 flex gap-2">
                        <Button onClick={() => window.location.reload()}>
                            <RefreshCw />
                            Reload
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                this.setState({ hasError: false });
                                window.location.assign('/');
                            }}
                        >
                            <Home />
                            Go home
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
