import { MEDIUM_FILE_PART_SIZE, LARGE_FILE_PART_SIZE, MEDIUM_FILE_MAX_SIZE } from "../utils/constants";

export const determinePartSize = (fileSize: number) => {
    if (fileSize <= MEDIUM_FILE_MAX_SIZE) {
        return MEDIUM_FILE_PART_SIZE;
    } else {
        return LARGE_FILE_PART_SIZE;
    }
}

export const formatFileSize = (sizeInKB: number): string => {
    if (sizeInKB < 0) {
        throw new Error('File size should be a non-negative number');
    }

    const units = ['KB', 'MB', 'GB', 'TB'];
    let size = sizeInKB;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    const formattedSize = size % 1 === 0 ? size.toFixed(0) : size.toFixed(2);
    const unit = units[unitIndex];

    return `${formattedSize} ${unit}`;
};