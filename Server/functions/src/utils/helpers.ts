// import { format } from 'date-fns';

// export const formatDateToDDMMYYYY = (date: Date): string => {
//     return format(date, 'dd/MM/yyyy');
// }

export const isValidEmail = (email: string): boolean => {
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return EMAIL_REGEX.test(email);
};

export const isValidName = (name: string): boolean => {
    const NAME_REGEX = /^[A-Za-z\s]{2,}$/;
    return NAME_REGEX.test(name);
};

export const isValidPassword = (password: string): boolean => {
    const PASSWORD_REGEX = /^(?=.{8,4096})(?:(?=(?:[^[A-Z]*[A-Z]){1,})|(?=(?:[^[a-z]*[a-z]){1,})|(?=(?:[^[\d]*\d){1,})|(?=(?:[^[\W_]*[\W_]){1,})){2,}\S{8,4096}$/
    return PASSWORD_REGEX.test(password);
};

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