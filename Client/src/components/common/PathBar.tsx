import React, { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Folder, MoreHorizontal } from "lucide-react";

import { useFolderStructureContext } from "../../contexts/FolderStructureContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PathBarProps {
    folderId: string;
    fileId?: string | null;
}

interface FolderObject {
    folderId: string;
    folderName: string;
}

const PathBar: React.FC<PathBarProps> = ({ folderId }) => {
    const { getFolderWithId } = useFolderStructureContext();
    const [folderPathObjects, setFolderPathObjects] = useState<FolderObject[]>([]);
    const [open, setOpen] = useState(false);

    const navigate = useNavigate();

    const navigateToFolder = (id: string) => {
        setOpen(false);
        navigate(`/user/folders/${id}`);
    }

    const getFolderPathObjects = (id: string): FolderObject[] => {
        const folderObjects: FolderObject[] = [];

        const populateFolderObjects = (currentFolderId: string) => {
            const folder = getFolderWithId(currentFolderId);
            if (folder) {
                let folderName = folder.folderName;
                if (currentFolderId === 'root') folderName = 'My Storage';
                else if (currentFolderId === 'shared') folderName = 'Shared Storage';

                folderObjects.unshift({ folderId: currentFolderId, folderName });

                if (folder.parentFolderId) {
                    populateFolderObjects(folder.parentFolderId);
                }
            }
        };

        populateFolderObjects(id);

        return folderObjects;
    };

    useEffect(() => {
        const parentFolderId = getFolderWithId(folderId)?.parentFolderId;
        setFolderPathObjects(getFolderPathObjects(parentFolderId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [folderId])

    // Long paths collapse into a popover so the bar never overflows a phone screen.
    const hiddenFolders = folderPathObjects.slice(0, -3);
    const visibleFolders = folderPathObjects.slice(-3);

    if (folderPathObjects.length === 0) return null;

    return (
        <nav aria-label="Folder path" className="flex min-w-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap">
            {hiddenFolders.length > 0 && (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Show ${hiddenFolders.length} parent folders`}>
                            <MoreHorizontal />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto min-w-52 p-1.5">
                        {hiddenFolders.map((folderPathObject: FolderObject) => (
                            <Button
                                key={folderPathObject.folderId}
                                variant="ghost"
                                className="block w-full truncate text-left"
                                onClick={() => navigateToFolder(folderPathObject.folderId)}
                            >
                                <Folder />
                                {folderPathObject.folderName}
                            </Button>
                        ))}
                    </PopoverContent>
                </Popover>
            )}
            {visibleFolders.map((folderPathObject: FolderObject, index: number) => (
                <Fragment key={folderPathObject.folderId}>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="max-w-40 truncate font-semibold"
                        onClick={() => navigateToFolder(folderPathObject.folderId)}
                    >
                        {folderPathObject.folderName}
                    </Button>
                    {index < visibleFolders.length - 1 && (
                        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                    )}
                </Fragment>
            ))}
        </nav>
    );

};

export default PathBar;
