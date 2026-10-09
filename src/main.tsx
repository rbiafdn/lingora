import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { progressStore } from './core/progress'
import { prefs } from './core/prefs'
import { navigate } from './router'
import './styles.css'

// Reopen the last language when the app is started without a specific page.
const last = prefs.get().lastLanguage
if (!location.hash.replace(/^#\/?/, '') && last) navigate(last, {}, true)

progressStore.init().catch((e) => console.error('Lingora: ilerleme yüklenemedi', e))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
