import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // relative asset URLs: the same build is served by the station under /crew/
  // and loaded from the file system inside the Capacitor shell
  base: './',
  server: {
    host: true,
  },
})
