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