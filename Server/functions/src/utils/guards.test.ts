import { describe, it, expect } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';
import { ACCESS_LEVEL, MAX_FILE_SIZE } from './constants.js';
import {
    requireAuth,
    requireFields,
    requireFileSize,
    requireName,
    safeExtension,
    requireAccess,
    accessLevelOf,
    escapeHtml,
    internal,
} from './guards.js';

const expectHttpsError = (fn: () => unknown, code: string) => {
    try {
        fn();
    } catch (err) {
        expect(err).toBeInstanceOf(HttpsError);
        expect((err as HttpsError).code).toBe(code);
        return;
    }
    throw new Error(`expected an HttpsError with code '${code}', nothing was thrown`);
};

describe('requireAuth', () => {
    it('returns the uid', () => {
        expect(requireAuth({ uid: 'abc' })).toBe('abc');
    });
    it('throws unauthenticated for missing auth', () => {
        expectHttpsError(() => requireAuth(undefined), 'unauthenticated');
        expectHttpsError(() => requireAuth(null), 'unauthenticated');
    });
});

describe('requireFields', () => {
    it('returns the record when fields are present', () => {
        expect(requireFields({ a: 1, b: 'x' }, ['a', 'b'])).toEqual({ a: 1, b: 'x' });
    });
    it('lists missing fields', () => {
        try {
            requireFields({ a: 1 }, ['a', 'b', 'c']);
            throw new Error('should have thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(HttpsError);
            expect((err as HttpsError).code).toBe('invalid-argument');
            expect((err as HttpsError).message).toContain('b');
            expect((err as HttpsError).message).toContain('c');
        }
    });
    it('treats null, undefined and empty string as missing', () => {
        expectHttpsError(() => requireFields({ a: '' }, ['a']), 'invalid-argument');
        expectHttpsError(() => requireFields({ a: null }, ['a']), 'invalid-argument');
        expectHttpsError(() => requireFields(null, ['a']), 'invalid-argument');
        expectHttpsError(() => requireFields('string', ['a']), 'invalid-argument');
    });
});

describe('requireFileSize', () => {
    it('accepts sizes in range and floors them', () => {
        expect(requireFileSize(1)).toBe(1);
        expect(requireFileSize(1024.9)).toBe(1024);
        expect(requireFileSize(MAX_FILE_SIZE)).toBe(MAX_FILE_SIZE);
    });
    it('rejects junk, zero, negative, huge, non-numbers', () => {
        for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, MAX_FILE_SIZE + 1, '1024', null, undefined]) {
            expectHttpsError(() => requireFileSize(bad), 'invalid-argument');
        }
    });
});

describe('requireName', () => {
    it('trims and accepts normal names', () => {
        expect(requireName('  notes.txt  ', 'file')).toBe('notes.txt');
        expect(requireName('a'.repeat(200), 'file')).toBe('a'.repeat(200));
    });
    it('rejects empty, oversized, and slash names (path traversal)', () => {
        expectHttpsError(() => requireName('   ', 'file'), 'invalid-argument');
        expectHttpsError(() => requireName('a'.repeat(201), 'file'), 'invalid-argument');
        expectHttpsError(() => requireName('../../etc/passwd', 'file'), 'invalid-argument');
        expectHttpsError(() => requireName('evil\\name', 'file'), 'invalid-argument');
        expectHttpsError(() => requireName(42, 'file'), 'invalid-argument');
    });
});

describe('safeExtension', () => {
    it('keeps short alphanumeric extensions', () => {
        expect(safeExtension('photo.JPG')).toBe('JPG');
        expect(safeExtension('archive.tar.gz')).toBe('gz');
        expect(safeExtension('notes.txt')).toBe('txt');
    });
    it('drops missing, long, and hostile extensions', () => {
        expect(safeExtension('noext')).toBe('');
        expect(safeExtension('endswithdot.')).toBe('');
        expect(safeExtension('.hidden')).toBe('');
        expect(safeExtension('x.a/b')).toBe(''); // path traversal
        expect(safeExtension('x.$(rm -rf)')).toBe(''); // injection
        expect(safeExtension('x.' + 'a'.repeat(11))).toBe(''); // absurd length
    });
});

describe('accessLevelOf / requireAccess', () => {
    const owner = { ownerUid: 'u1', collaborators: {} };
    const withNumeric = { ownerUid: 'u1', collaborators: { u2: ACCESS_LEVEL.OPERATOR } };
    const withObject = { ownerUid: 'u1', collaborators: { u2: { name: 'X', email: 'x@y.z', accessLevel: ACCESS_LEVEL.VIEWER } } };

    it('owner has full access', () => {
        expect(() => requireAccess(owner, 'u1', ACCESS_LEVEL.ADMIN, 'nope')).not.toThrow();
        expect(accessLevelOf(owner, 'u1')).toBe(ACCESS_LEVEL.NON_COLLABORATOR); // not in the map; owner checked separately
    });
    it('numeric collaborator entries work', () => {
        expect(accessLevelOf(withNumeric, 'u2')).toBe(ACCESS_LEVEL.OPERATOR);
        expect(() => requireAccess(withNumeric, 'u2', ACCESS_LEVEL.OPERATOR, 'nope')).not.toThrow();
        expectHttpsError(() => requireAccess(withNumeric, 'u2', ACCESS_LEVEL.ADMIN, 'nope'), 'permission-denied');
    });
    it('object collaborator entries (the real shape) work', () => {
        expect(accessLevelOf(withObject, 'u2')).toBe(ACCESS_LEVEL.VIEWER);
        expect(() => requireAccess(withObject, 'u2', ACCESS_LEVEL.VIEWER, 'nope')).not.toThrow();
        expectHttpsError(() => requireAccess(withObject, 'u2', ACCESS_LEVEL.OPERATOR, 'nope'), 'permission-denied');
    });
    it('strangers are refused, missing resources are not-found', () => {
        expectHttpsError(() => requireAccess(owner, 'u9', ACCESS_LEVEL.VIEWER, 'nope'), 'permission-denied');
        expectHttpsError(() => requireAccess(null, 'u1', ACCESS_LEVEL.VIEWER, 'gone'), 'not-found');
    });
});

describe('escapeHtml', () => {
    it('neutralizes markup injection', () => {
        expect(escapeHtml('<script>alert("x&y")</script>')).toBe(
            '&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;'
        );
        expect(escapeHtml("it's fine")).toBe('it&#39;s fine');
    });
});

describe('internal', () => {
    it('passes HttpsErrors through with their code', () => {
        const original = new HttpsError('not-found', 'File not found');
        const mapped = internal('testOp', original);
        expect(mapped).toBe(original);
    });
    it('masks unknown errors behind a generic message', () => {
        const mapped = internal('testOp', new Error('firestore://internal-detail'));
        expect(mapped.code).toBe('internal');
        expect(mapped.message).not.toContain('firestore');
        expect(mapped.details).toBeUndefined();
    });
});
