import { useRoute } from './router'
import { Welcome } from './pages/Welcome'
import { LanguageShell } from './pages/LanguageShell'

export function App() {
  const { path } = useRoute()
  const languageId = path[0]
  if (!languageId) return <Welcome />
  return <LanguageShell key={languageId} languageId={languageId} />
}
