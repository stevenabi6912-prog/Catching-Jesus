import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' makes the build work on GitHub Pages under any repo subpath
// (e.g. https://user.github.io/catch-jesus/) as well as locally.
export default defineConfig({
  plugins: [react()],
  base: './',
})
