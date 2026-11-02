import { describe, it, expect } from 'vitest';
import { formatFileSize, determinePartSize, formatDateTimeLocal, formatDateToDDMMYYYY } from './helpers';
import { MEDIUM_FILE_MAX_SIZE, MEDIUM_FILE_PART_SIZE, LARGE_FILE_PART_SIZE } from './constants';

describe('formatFileSize', () => {
    it('formats across units', () => {
        expect(formatFileSize(0)).toBe('0 B');
        expect(formatFileSize(1024)).toBe('1 KB');
        expect(formatFileSize(1536)).toBe('1.5 KB');
        expect(formatFileSize(500 * 1024 * 1024)).toBe('500 MB');
    });
    it('throws on invalid sizes', () => {
        expect(() => formatFileSize(-1)).toThrow();
        expect(() => formatFileSize(Number.NaN)).toThrow();
    });
});

describe('determinePartSize', () => {
    it('uses medium parts up to the medium max, large parts beyond', () => {
        expect(determinePartSize(1024)).toBe(MEDIUM_FILE_PART_SIZE);
        expect(determinePartSize(MEDIUM_FILE_MAX_SIZE)).toBe(MEDIUM_FILE_PART_SIZE);
        expect(determinePartSize(MEDIUM_FILE_MAX_SIZE + 1)).toBe(LARGE_FILE_PART_SIZE);
    });
});

describe('formatDateTimeLocal', () => {
    it('pads month/day/hour/minute for <input type="datetime-local">', () => {
        const date = new Date(2026, 0, 5, 9, 7); // Jan 5 2026 09:07 local
        expect(formatDateTimeLocal(date)).toBe('2026-01-05T09:07');
    });
});

describe('formatDateToDDMMYYYY', () => {
    it('formats as dd/MM/yyyy', () => {
        expect(formatDateToDDMMYYYY(new Date(2026, 10, 3))).toBe('03/11/2026');
    });
});
