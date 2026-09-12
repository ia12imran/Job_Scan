import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Job_Scan/',
  build: {
    chunkSizeWarningLimit: 1000, // kB
  },
})