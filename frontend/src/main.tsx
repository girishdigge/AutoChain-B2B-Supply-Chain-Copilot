import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import './index.css';
import App from './App.tsx';
import { AppStateProvider } from './context/AppStateContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import { validateEnvironment, logger } from './lib/environment';

// Import test utilities in development
if (import.meta.env.DEV) {
  import('./utils/testClarificationDialog');
}

// Validate environment configuration
const envValidation = validateEnvironment();
if (!envValidation.valid) {
  console.error('Environment validation failed:', envValidation.errors);
  envValidation.errors.forEach((error) => logger.error(error));
}

// Initialize theme class on document
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.classList.add(savedTheme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStateProvider>
      <ThemeProvider>
        <SidebarProvider>
          <WebSocketProvider>
            <App />
            <Toaster
              position='top-right'
              expand={true}
              richColors
              closeButton
              duration={5000}
            />
          </WebSocketProvider>
        </SidebarProvider>
      </ThemeProvider>
    </AppStateProvider>
  </StrictMode>
);
