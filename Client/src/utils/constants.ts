export const WEBSITE_URL = "https://bobox.netlify.app"

export const MB = 1024 * 1024;
export const GB = 1024 * MB;
//export const SMALL_FILE_PART_SIZE = 10 * MB;
export const MEDIUM_FILE_PART_SIZE = 20 * MB;
export const LARGE_FILE_PART_SIZE = 100 * MB;
export const MAX_FILE_SIZE_STRING = "500MB"

//export const SMALL_FILE_MAX_SIZE = 50 * MB;
export const MEDIUM_FILE_MAX_SIZE = 100 * MB;
export const LARGE_FILE_MAX_SIZE = 500 * MB;
export const MIN_MULTIPART_UPLOAD_SIZE = 50 * MB;
export const MAX_UPLOAD_RETRIES = 3;

export const enum ACCESS_LEVEL {
    ADMIN = 1,
    OPERATOR = 2,
    VIEWER = 3,
    NON_COLLABORATOR = 4
}

export const enum ITEM_TYPE {
    FILE = 'file',
    FOLDER = 'folder'
}

export enum SORT_TYPE {
    BY_NAME_DESC = 'By name descending',
    BY_NAME_ASC = 'By name ascending',
    BY_DATE_ASC = 'By date ascending',
    BY_DATE_DESC = 'By date descending',
}

export enum FILTER_ITEMS_TYPE {
    BOTH = 'Both',
    FOLDERS_ONLY = 'Folders only',
    FILES_ONLY = 'Files only'
}