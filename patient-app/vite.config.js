import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
  },

  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'threads',
    fileParallelism: false,
    maxWorkers: 1,

    setupFiles: ['./tests/setup.js'],
  },
})
