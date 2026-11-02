import { toast } from 'sonner';

/**
 * Central error-to-message mapping. Firebase callable errors carry a stable
 * `code`; our server sends human-readable messages for every intentional
 * failure, and masks unexpected ones behind a generic 'internal' text. This
 * turns any thrown value (callable error, auth error, network failure) into
 * one short, friendly sentence, and never shows raw SDK noise to the user.
 */

interface CodeLikeError {
    code?: unknown;
    message?: unknown;
    details?: { message?: unknown };
}

const OFFLINE = 'We could not reach the server. Check your connection and try again.';
const GENERIC = 'Something went wrong on our side. Please try again.';

/** Codes whose server message was written for users: show it verbatim. */
const PASSTHROUGH_CODES = new Set([
    'invalid-argument',
    'not-found',
    'already-exists',
    'permission-denied',
    'resource-exhausted',
    'failed-precondition',
    'out-of-range',
    'unimplemented',
    'aborted',
    'data-exists',
    'data-loss',
    'internal', // server's internal message is already the friendly generic one
]);

const AUTH_MESSAGES: Record<string, string> = {
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/invalid-login-credentials': 'Incorrect email or password.',
    'auth/user-not-found': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/email-already-in-use': 'An account with this email address already exists. Try logging in.',
    'auth/weak-password': 'That password is too weak. Use at least 8 characters with two of: uppercase, lowercase, number, symbol.',
    'auth/too-many-requests': 'Too many attempts. Please wait a minute and try again.',
    'auth/network-request-failed': OFFLINE,
    'auth/user-disabled': 'This account has been disabled.',
    'auth/popup-closed-by-user': 'The sign-in popup was closed before finishing.',
    'auth/cancelled-popup-request': 'The sign-in popup was closed before finishing.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled.',
    'auth/invalid-email': 'That email address is not valid.',
    'auth/expired-action-code': 'This reset link has expired. Request a new one.',
    'auth/invalid-action-code': 'This reset link is invalid. Request a new one.',
};

const looksTechnical = (text: string): boolean =>
    text.length > 200 ||
    /firebase|firestore|cloudfunctions|https?:\/\/|\[object |\{|\}|undefined|null|stack|at \w+\. /.test(text);

/** Maps any thrown value to a short, user-friendly sentence. */
export function toFriendlyMessage(err: unknown, fallback: string = GENERIC): string {
    const e = (err ?? {}) as CodeLikeError;
    const code = typeof e.code === 'string' ? e.code : '';
    const raw = typeof e.message === 'string' ? e.message.trim() : '';

    // Firebase Auth errors (their messages are terse SDK codes, map by code).
    if (code.startsWith('auth/')) {
        return AUTH_MESSAGES[code] ?? (raw && !looksTechnical(raw) ? raw : fallback);
    }

    // Axios / fetch network failures never reach the server.
    if (code === 'ERR_NETWORK' || code === 'ECONNABORTED' || (err instanceof TypeError && /fetch|network/i.test(raw))) {
        return OFFLINE;
    }

    // Firebase callable protocol codes.
    switch (code) {
        case 'unauthenticated':
            return 'Your session has expired. Please sign in again.';
        case 'unavailable':
            return OFFLINE;
        case 'deadline-exceeded':
            return 'The server took too long to respond. Please try again.';
        case 'cancelled':
            return 'The request was cancelled.';
    }

    if (PASSTHROUGH_CODES.has(code) && raw && !looksTechnical(raw)) {
        return raw;
    }

    // Plain Error objects we throw ourselves (validators etc.).
    if (err instanceof Error && raw && !looksTechnical(raw)) {
        return raw;
    }

    return fallback;
}

/** One place for failure toasts: friendly message, deduped by content. */
export function notifyError(err: unknown, fallback?: string): void {
    const message = toFriendlyMessage(err, fallback);
    toast.error(message, { id: message });
}

/**
 * Clipboard write that never throws: returns false when the browser refused
 * (insecure context, permissions), so callers can show a manual-copy hint
 * instead of an unhandled rejection.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        /* fall through to the legacy path */
    }
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}
