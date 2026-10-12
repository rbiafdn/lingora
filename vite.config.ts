import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production builds are served from GitHub Pages at /lingora/; dev stays at /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/lingora/' : '/',
  plugins: [react()],
  server: { port: 5190 },
}))
