import { MEDIUM_FILE_PART_SIZE, LARGE_FILE_PART_SIZE, MEDIUM_FILE_MAX_SIZE } from "../utils/constants";

export const determinePartSize = (fileSize: number) => {
    if (fileSize <= MEDIUM_FILE_MAX_SIZE) {
        return MEDIUM_FILE_PART_SIZE;
    } else {
        return LARGE_FILE_PART_SIZE;
    }
}