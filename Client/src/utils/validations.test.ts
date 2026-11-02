import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidName, isValidPassword } from './validations';

// These mirror the server validators (Server/functions/src/utils/helpers.ts).
// Client and server must agree, so the cases are kept in parity with the
// server-side suite.

describe('isValidEmail', () => {
    it('accepts normal addresses', () => {
        expect(isValidEmail('ofek@example.com')).toBe(true);
        expect(isValidEmail('a.b+c@sub.example.co.il')).toBe(true);
    });
    it('rejects malformed input', () => {
        expect(isValidEmail('')).toBe(false);
        expect(isValidEmail('no-at-sign.com')).toBe(false);
        expect(isValidEmail('spaces in@mail.com')).toBe(false);
        expect(isValidEmail('no-tld@domain')).toBe(false);
        expect(isValidEmail(`${'a'.repeat(250)}@b.com`)).toBe(false);
    });
});

describe('isValidName', () => {
    it('accepts Latin, Hebrew, accented and spaced names', () => {
        expect(isValidName('Bob')).toBe(true);
        expect(isValidName('Bob Smith')).toBe(true);
        expect(isValidName('אופק כהן')).toBe(true);
        expect(isValidName('José García')).toBe(true);
        expect(isValidName("O'Brien-Smith")).toBe(true);
    });
    it('rejects short, numeric, newline and path names', () => {
        expect(isValidName('')).toBe(false);
        expect(isValidName('A')).toBe(false);
        expect(isValidName('Bob1')).toBe(false);
        expect(isValidName('Bob\nEvil')).toBe(false);
        expect(isValidName('Bob../../etc')).toBe(false);
        expect(isValidName('A'.repeat(61))).toBe(false);
    });
});

describe('isValidPassword', () => {
    it('accepts 8+ chars with two character classes', () => {
        expect(isValidPassword('Password1')).toBe(true);
        expect(isValidPassword('alllower1!')).toBe(true);
        expect(isValidPassword('Aa1!aaaa')).toBe(true);
    });
    it('rejects short, single-class and non-string', () => {
        expect(isValidPassword('Short1!')).toBe(false);
        expect(isValidPassword('alllowercase')).toBe(false);
        expect(isValidPassword('12345678')).toBe(false);
        expect(isValidPassword(undefined as unknown as string)).toBe(false);
    });
});
