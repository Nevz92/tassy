import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' para funcionar em qualquer subcaminho (GitHub Pages)
export default defineConfig({
  base: './',
  plugins: [react()],
})
