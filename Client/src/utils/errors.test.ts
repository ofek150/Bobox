import { describe, it, expect, vi, afterEach } from 'vitest';
import { toFriendlyMessage, copyToClipboard } from './errors';

const callableError = (code: string, message: string) => {
    const err = new Error(message);
    (err as any).code = code;
    return err;
};

describe('toFriendlyMessage — callable codes', () => {
    it('maps session and network codes to fixed friendly text', () => {
        expect(toFriendlyMessage(callableError('unauthenticated', 'x'))).toBe('Your session has expired. Please sign in again.');
        expect(toFriendlyMessage(callableError('unavailable', 'x'))).toBe('We could not reach the server. Check your connection and try again.');
        expect(toFriendlyMessage(callableError('deadline-exceeded', 'x'))).toBe('The server took too long to respond. Please try again.');
    });
    it('passes through user-facing server messages', () => {
        expect(toFriendlyMessage(callableError('not-found', 'File not found'))).toBe('File not found');
        expect(toFriendlyMessage(callableError('already-exists', 'A file with the same name already exists in this folder.'))).toBe('A file with the same name already exists in this folder.');
        expect(toFriendlyMessage(callableError('resource-exhausted', "User has reached the maximum total file size limit (500 MB)"))).toContain('maximum total file size');
    });
    it('never shows raw SDK/technical noise', () => {
        const leak = callableError('internal', 'firestore: read permission denied at firestore.googleapis.com {code:7}');
        expect(toFriendlyMessage(leak)).toBe('Something went wrong on our side. Please try again.');
    });
    it('falls back for unknown shapes', () => {
        expect(toFriendlyMessage(null)).toBe('Something went wrong on our side. Please try again.');
        expect(toFriendlyMessage('a string')).toBe('Something went wrong on our side. Please try again.');
        expect(toFriendlyMessage(new Error(''), 'custom fallback')).toBe('custom fallback');
    });
});

describe('toFriendlyMessage — auth codes', () => {
    it('maps Firebase Auth codes to friendly sentences', () => {
        expect(toFriendlyMessage(callableError('auth/invalid-credential', 'x'))).toBe('Incorrect email or password.');
        expect(toFriendlyMessage(callableError('auth/wrong-password', 'x'))).toBe('Incorrect email or password.');
        expect(toFriendlyMessage(callableError('auth/email-already-in-use', 'x'))).toContain('already exists');
        expect(toFriendlyMessage(callableError('auth/too-many-requests', 'x'))).toContain('Too many attempts');
        expect(toFriendlyMessage(callableError('auth/popup-closed-by-user', 'x'))).toContain('popup');
    });
});

describe('toFriendlyMessage — network failures', () => {
    it('maps axios network errors and fetch TypeErrors to offline', () => {
        const axiosErr = new Error('Network Error');
        (axiosErr as any).code = 'ERR_NETWORK';
        expect(toFriendlyMessage(axiosErr)).toBe('We could not reach the server. Check your connection and try again.');

        expect(toFriendlyMessage(new TypeError('Failed to fetch'))).toBe('We could not reach the server. Check your connection and try again.');
    });
});

describe('toFriendlyMessage — our own validation errors', () => {
    it('shows plain Error messages verbatim', () => {
        expect(toFriendlyMessage(new Error('Invalid email format. Please provide a valid email address.'))).toBe('Invalid email format. Please provide a valid email address.');
    });
});

describe('copyToClipboard', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('uses the async clipboard when available', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        expect(await copyToClipboard('https://x.example/link')).toBe(true);
        expect(writeText).toHaveBeenCalledWith('https://x.example/link');
    });

    it('falls back to execCommand when the clipboard API is missing', async () => {
        Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
        document.execCommand = vi.fn().mockReturnValue(true);
        expect(await copyToClipboard('text')).toBe(true);
        expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    it('returns false instead of throwing when everything fails', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
            configurable: true,
        });
        document.execCommand = vi.fn().mockImplementation(() => { throw new Error('nope'); });
        expect(await copyToClipboard('text')).toBe(false);
    });
});
