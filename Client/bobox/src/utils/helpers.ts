import { MEDIUM_FILE_PART_SIZE, LARGE_FILE_PART_SIZE, MEDIUM_FILE_MAX_SIZE } from "../utils/constants";

export const determinePartSize = (fileSize: number) => {
    if (fileSize <= MEDIUM_FILE_MAX_SIZE) {
        return MEDIUM_FILE_PART_SIZE;
    } else {
        return LARGE_FILE_PART_SIZE;
    }
}

export const formatDateTimeLocal = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
