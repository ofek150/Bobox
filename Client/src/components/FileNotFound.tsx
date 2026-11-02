import React from 'react';
import { FileQuestion } from 'lucide-react';

const FileNotFound: React.FC = () => {
    return (
        <div className="flex flex-1 items-center justify-center px-4 py-16">
            <div className="flex max-w-sm flex-col items-center gap-3 text-center">
                <FileQuestion className="size-12 text-muted-foreground/60" />
                <h1 className="text-2xl font-bold">File not found</h1>
                <p className="text-muted-foreground">
                    The requested file could not be found. It may have been deleted,
                    or the link you followed has expired.
                </p>
            </div>
        </div>
    );
};

export default FileNotFound;
