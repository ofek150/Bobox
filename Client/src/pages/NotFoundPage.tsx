import React from "react";
import { Link } from "react-router-dom";
import { House } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFoundPage: React.FC = () => {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
            <p className="text-6xl font-bold text-muted-foreground/40">404</p>
            <h1 className="text-2xl font-bold">Something went wrong!</h1>
            <p className="max-w-sm text-muted-foreground">
                The page you're looking for doesn't exist.
            </p>
            <Button asChild variant="secondary" className="mt-2">
                <Link to="/">
                    <House />
                    Back to my files
                </Link>
            </Button>
        </div>
    );
}

export default NotFoundPage;
