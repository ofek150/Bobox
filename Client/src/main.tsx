import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { FolderStructureProvider } from './contexts/FolderStructureContext.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* next-themes drives the Tailwind/shadcn theme via class="dark" on <html>.
        The MUI ThemeProvider is gone: MUI v5 + Vite 7 pre-bundling crashes on
        createTheme, so pages not migrated yet render with plain MUI defaults. */}
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <FolderStructureProvider>
        <App />
        <Toaster position="bottom-right" richColors closeButton />
      </FolderStructureProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
