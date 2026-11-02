import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../services/firebase', () => ({
    getFileInfo: vi.fn(),
}));
vi.mock('streamsaver', () => ({
    default: { createWriteStream: vi.fn() },
}));

import { getFileInfo } from '../services/firebase';
import FileInfo from '../pages/FileInfo';

const sharedFile = {
    fileName: 'holiday.jpg',
    fileType: 'image/jpeg',
    fileSize: 1024,
    uploadedAt: 'Mon Jan 05 2026 09:00:00 GMT+0200',
    downloadId: 'd1',
    downloadLink: 'https://cache.example/holiday.jpg',
};

const renderPage = () =>
    render(
        <MemoryRouter initialEntries={['/user/u1/files/f1?downloadId=d1']}>
            <Routes>
                <Route path="/user/:ownerUid/files/:fileId" element={<FileInfo />} />
            </Routes>
        </MemoryRouter>
    );

describe('FileInfo page', () => {
    beforeEach(() => {
        vi.mocked(getFileInfo).mockReset();
    });

    it('shows the file card when the link is valid', async () => {
        vi.mocked(getFileInfo).mockResolvedValue({ fileInfo: sharedFile });
        renderPage();

        expect(await screen.findByText('holiday.jpg')).toBeTruthy();
        expect(screen.getByRole('button', { name: /download/i })).toBeTruthy();
    });

    it('shows a friendly not-found card when the call fails (used to render a blank page)', async () => {
        vi.mocked(getFileInfo).mockResolvedValue({ error: 'Download link has expired' });
        renderPage();

        expect(await screen.findByText('File not found')).toBeTruthy();
        expect(screen.getByText('Download link has expired')).toBeTruthy();
        expect(screen.getByRole('link', { name: /my storage/i })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /download/i })).toBeNull();
    });

    it('always stops the spinner, success or failure', async () => {
        vi.mocked(getFileInfo).mockResolvedValue({ error: 'This link is no longer available.' });
        renderPage();
        await waitFor(() => expect(screen.getByText('This link is no longer available.')).toBeTruthy());
        expect(vi.mocked(getFileInfo)).toHaveBeenCalledTimes(1);
    });
});
