export const WEBSITE_URL = "http://localhost:3000"

export const MB = 1024 * 1024;
export const GB = 1024 * MB;
//export const SMALL_FILE_PART_SIZE = 10 * MB;
export const MEDIUM_FILE_PART_SIZE = 20 * MB;
export const LARGE_FILE_PART_SIZE = 100 * MB;

//export const SMALL_FILE_MAX_SIZE = 50 * MB;
export const MEDIUM_FILE_MAX_SIZE = 100 * MB;
export const LARGE_FILE_MAX_SIZE = 1 * GB;
export const MIN_MULTIPART_UPLOAD_SIZE = 50 * MB;
export const MAX_UPLOAD_RETRIES = 3;

export enum ACCESS_LEVEL {
    ADMIN = 1,
    OPERATOR = 2,
    VIEWER = 3,
    NON_COLLABORATOR = 4
}