export const WEBSITE_URL = "http://localhost:3000"

export const MB = 1024 * 1024;
export const GB = 1024 * MB;

export const MAX_FILE_SIZE = 500 * MB;

export const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
export const ONE_DAY_SECONDS = 24 * 60 * 60;

export enum ACCESS_LEVEL {
    ADMIN = 1,
    OPERATOR = 2,
    VIEWER = 3,
    NON_COLLABORATOR = 4
}

export const DEFAULT_MAX_TOTAL_FILE_SIZE = 500 * MB;