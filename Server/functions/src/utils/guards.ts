import { HttpsError } from "firebase-functions/v2/https";
import { ACCESS_LEVEL, MAX_FILE_SIZE } from "./constants.js";

/**
 * Shared request guards for the v2 callables.
 * Every callable authenticates, validates its payload shape, and maps
 * unexpected errors through `internal()` so raw SDK/Firestore messages
 * never reach the client.
 */

export interface CollaboratorEntry {
    name?: string;
    email?: string;
    accessLevel: number;
}

export interface Collaborative {
    ownerUid?: string;
    collaborators?: Record<string, CollaboratorEntry | number>;
}

/** Access level of `uid` on a resource (ADMIN=1 most, NON_COLLABORATOR=4). */
export function accessLevelOf(resource: Collaborative, uid: string): ACCESS_LEVEL {
    const entry = resource.collaborators?.[uid];
    if (entry === undefined) return ACCESS_LEVEL.NON_COLLABORATOR;
    return typeof entry === 'number' ? entry : (entry.accessLevel ?? ACCESS_LEVEL.NON_COLLABORATOR);
}

/** Returns the caller uid or throws `unauthenticated`. */
export function requireAuth(auth: { uid: string } | undefined | null): string {
    if (!auth) {
        throw new HttpsError('unauthenticated', 'Please sign in to continue.');
    }
    return auth.uid;
}

/** Ensures `data` is an object with all named fields present and non-empty. */
export function requireFields(data: unknown, fields: string[]): Record<string, any> {
    if (typeof data !== 'object' || data === null) {
        throw new HttpsError('invalid-argument', 'Missing request data.');
    }
    const record = data as Record<string, any>;
    const missing = fields.filter((f) => record[f] === undefined || record[f] === null || record[f] === '');
    if (missing.length > 0) {
        throw new HttpsError('invalid-argument', `Missing required fields: ${missing.join(', ')}.`);
    }
    return record;
}

/** A finite, positive, bounded byte size. */
export function requireFileSize(fileSize: unknown): number {
    if (typeof fileSize !== 'number' || !Number.isFinite(fileSize) || fileSize <= 0) {
        throw new HttpsError('invalid-argument', 'The file size is invalid.');
    }
    if (fileSize > MAX_FILE_SIZE) {
        throw new HttpsError('invalid-argument', 'The file is larger than the maximum allowed size.');
    }
    return Math.floor(fileSize);
}

/** A printable, length-capped resource name (file/folder). */
export function requireName(name: unknown, what: string): string {
    if (typeof name !== 'string') {
        throw new HttpsError('invalid-argument', `The ${what} name is invalid.`);
    }
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > 200) {
        throw new HttpsError('invalid-argument', `The ${what} name must be between 1 and 200 characters.`);
    }
    if (trimmed.includes('/') || trimmed.includes('\\')) {
        throw new HttpsError('invalid-argument', `The ${what} name cannot contain slashes.`);
    }
    return trimmed;
}

/**
 * A storage-safe extension from a file name: last dot segment, short, and
 * alphanumeric only. Anything suspicious yields no extension, so hostile
 * names ("x.a/b", "x.$(cmd)") can never escape their path segment in the
 * R2 object key.
 */
export function safeExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot <= 0 || lastDot === fileName.length - 1) return '';
    const ext = fileName.slice(lastDot + 1);
    return /^[A-Za-z0-9]{1,10}$/.test(ext) ? ext : '';
}

/** Owner, or collaborator with at least `maxLevel` access (ADMIN = most). */
export function requireAccess(resource: Collaborative | null, uid: string, maxLevel: ACCESS_LEVEL, notFoundMessage: string): void {
    if (!resource) {
        throw new HttpsError('not-found', notFoundMessage);
    }
    if (resource.ownerUid === uid) return;
    if (accessLevelOf(resource, uid) > maxLevel) {
        throw new HttpsError('permission-denied', "You don't have permission to do this.");
    }
}

/**
 * Wraps an unexpected failure: the real cause goes to the logs, the client
 * gets a short, friendly, code-stable message.
 */
export function internal(op: string, err: unknown): HttpsError {
    console.error(`[${op}]`, err);
    if (err instanceof HttpsError) return err;
    return new HttpsError('internal', 'Something went wrong on our side. Please try again.');
}

/** Escapes text interpolated into the invite email HTML. */
export function escapeHtml(text: string): string {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
