import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { FolderStructureProvider } from './contexts/FolderStructureContext.tsx';
import { SnackbarProvider } from 'notistack';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* next-themes drives the Tailwind/shadcn theme via class="dark" on <html>.
        notistack stays until the pages move to sonner; the MUI provider is gone
        (MUI v5 + Vite 7 ESM interop breaks createTheme), so not-yet-migrated
        pages render with the plain MUI defaults. */}
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SnackbarProvider maxSnack={3} autoHideDuration={3000}>
        <FolderStructureProvider>
          <App />
          <Toaster position="bottom-right" richColors closeButton />
        </FolderStructureProvider>
      </SnackbarProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
