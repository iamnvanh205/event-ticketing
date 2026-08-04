import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { Toaster } from './components/ui/sonner'
import { LanguageProvider } from './components/layout/LanguageProvider'
import { installInternalNavigation } from './routes/navigation'
import './index.css'
import App from './App.tsx'

installInternalNavigation()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LanguageProvider>
        <App />
        <Toaster position="top-right" richColors />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
)
