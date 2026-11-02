export const isValidEmail = (email: string): boolean => {
    if (typeof email !== 'string' || email.length > 254) return false;
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return EMAIL_REGEX.test(email);
};

/** 2-60 chars of letters (any alphabet), spaces, and name punctuation. */
export const isValidName = (name: string): boolean => {
    if (typeof name !== 'string') return false;
    const NAME_REGEX = /^[\p{L}][\p{L} '’.-]{1,59}$/u;
    return NAME_REGEX.test(name);
};

/** 8+ chars, at least two of: upper, lower, digit, symbol (no length cap needed for the classes). */
export const isValidPassword = (password: string): boolean => {
    if (typeof password !== 'string' || password.length < 8 || password.length > 4096) return false;
    const classes = [
        /[A-Z]/.test(password),
        /[a-z]/.test(password),
        /\d/.test(password),
        /[^A-Za-z\d]/.test(password)
    ].filter(Boolean).length;
    return classes >= 2;
};

export const formatFileSize = (sizeInBytes: number): string => {
    if (typeof sizeInBytes !== 'number' || !Number.isFinite(sizeInBytes) || sizeInBytes < 0) {
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
