import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import ErrorBoundary from './ErrorBoundary';

const Boom: React.FC = () => {
    throw new Error('boom');
};

describe('ErrorBoundary', () => {
    beforeEach(() => {
        // React logs the caught error loudly; silence the expected noise.
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    it('renders children normally', () => {
        render(
            <ErrorBoundary>
                <p>all fine</p>
            </ErrorBoundary>
        );
        expect(screen.getByText('all fine')).toBeTruthy();
    });

    it('shows a recovery card instead of a blank page when a child crashes', () => {
        render(
            <ErrorBoundary>
                <Boom />
            </ErrorBoundary>
        );
        expect(screen.getByText('Something broke')).toBeTruthy();
        expect(screen.getByRole('button', { name: /reload/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /go home/i })).toBeTruthy();
    });
});
