import { MEDIUM_FILE_PART_SIZE, LARGE_FILE_PART_SIZE, MEDIUM_FILE_MAX_SIZE } from "../utils/constants";
import { format } from 'date-fns';

export const determinePartSize = (fileSize: number) => {
    if (fileSize <= MEDIUM_FILE_MAX_SIZE) {
        return MEDIUM_FILE_PART_SIZE;
    } else {
        return LARGE_FILE_PART_SIZE;
    }
}

export const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 0) {
        throw new Error('File size should be a non-negative number');
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = sizeInBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    const formattedSize = Math.round(size * 100) / 100;
    const unit = units[unitIndex];

    return `${formattedSize} ${unit}`;
};





export const formatDateTimeLocal = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatDateToDDMMYYYY = (date: Date): string => {
    return format(date, 'dd/MM/yyyy');
}
