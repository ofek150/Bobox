import { Loader2 } from 'lucide-react';

const Loading: React.FC = () => {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 aria-label="Loading" className="size-10 animate-spin text-primary" />
        </div>
    );
};

export default Loading;
