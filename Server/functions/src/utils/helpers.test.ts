import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidName, isValidPassword, formatFileSize } from './helpers.js';

describe('isValidEmail', () => {
    it('accepts normal addresses', () => {
        expect(isValidEmail('ofek@example.com')).toBe(true);
        expect(isValidEmail('a.b+c@sub.example.co.il')).toBe(true);
    });
    it('rejects malformed input', () => {
        expect(isValidEmail('')).toBe(false);
        expect(isValidEmail('no-at-sign.com')).toBe(false);
        expect(isValidEmail('two@@at.com')).toBe(false);
        expect(isValidEmail('spaces in@mail.com')).toBe(false);
        expect(isValidEmail('no-tld@domain')).toBe(false);
        expect(isValidEmail('a@b@c.com')).toBe(false);
    });
    it('rejects absurdly long addresses', () => {
        expect(isValidEmail(`${'a'.repeat(250)}@b.com`)).toBe(false);
    });
    it('survives non-string input', () => {
        expect(isValidEmail(undefined as unknown as string)).toBe(false);
        expect(isValidEmail(42 as unknown as string)).toBe(false);
    });
});

describe('isValidName', () => {
    it('accepts Latin, Hebrew, accented and spaced names', () => {
        expect(isValidName('Bob')).toBe(true);
        expect(isValidName('Bob Smith')).toBe(true);
        expect(isValidName('אופק כהן')).toBe(true);
        expect(isValidName('José García')).toBe(true);
        expect(isValidName("O'Brien-Smith")).toBe(true);
        expect(isValidName('Анна Петрова')).toBe(true);
    });
    it('rejects too short, empty, control chars and injection', () => {
        expect(isValidName('')).toBe(false);
        expect(isValidName('A')).toBe(false);
        expect(isValidName('Bob1')).toBe(false);
        expect(isValidName('Bob\nEvil')).toBe(false);
        expect(isValidName('Bob../../etc')).toBe(false);
        expect(isValidName('   ')).toBe(false);
        expect(isValidName('-Bob')).toBe(false); // must start with a letter
    });
    it('caps length at 60', () => {
        expect(isValidName('A'.repeat(60))).toBe(true);
        expect(isValidName('A'.repeat(61))).toBe(false);
    });
});

describe('isValidPassword', () => {
    it('accepts 8+ chars with two character classes', () => {
        expect(isValidPassword('Password1')).toBe(true);
        expect(isValidPassword('alllower1!')).toBe(true);
        expect(isValidPassword('ALLUPPER1!')).toBe(true);
        expect(isValidPassword('Aa1!aaaa')).toBe(true);
    });
    it('rejects short, long, weak and non-string', () => {
        expect(isValidPassword('Short1!')).toBe(false); // 7 chars
        expect(isValidPassword('alllowercase')).toBe(false); // one class
        expect(isValidPassword('12345678')).toBe(false); // one class
        expect(isValidPassword('A'.repeat(4097))).toBe(false);
        expect(isValidPassword(undefined as unknown as string)).toBe(false);
    });
});

describe('formatFileSize', () => {
    it('formats across units', () => {
        expect(formatFileSize(0)).toBe('0 B');
        expect(formatFileSize(999)).toBe('999 B');
        expect(formatFileSize(1024)).toBe('1 KB');
        expect(formatFileSize(1536)).toBe('1.5 KB');
        expect(formatFileSize(500 * 1024 * 1024)).toBe('500 MB');
        expect(formatFileSize(3 * 1024 ** 4)).toBe('3 TB');
    });
    it('rounds to two decimals', () => {
        expect(formatFileSize(1000)).toBe('1000 B'); // only crosses to KB at 1024
        expect(formatFileSize(1023)).toBe('1023 B');
        expect(formatFileSize(1100)).toBe('1.07 KB');
    });
    it('throws on invalid sizes instead of Infinity loops', () => {
        expect(() => formatFileSize(-1)).toThrow();
        expect(() => formatFileSize(Number.NaN)).toThrow();
        expect(() => formatFileSize(Number.POSITIVE_INFINITY)).toThrow();
    });
});
