import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  test: {
    environment: 'jsdom',
    globals: true,
    // Inject empty VITE_API_URL so service modules resolve import.meta.env in tests.
    // This only applies to the test environment — production reads the real .env.
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(''),
    },
  },
})
