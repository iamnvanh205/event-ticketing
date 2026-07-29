import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { Toaster } from './components/ui/sonner'
import { installInternalNavigation } from './routes/navigation'
import './index.css'
import App from './App.tsx'

installInternalNavigation()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <App />
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  </StrictMode>,
)
