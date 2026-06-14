import { defineConfig } from 'vite'
import { cyberguardApiPlugin } from './server/viteApiPlugin.js'

export default defineConfig({
  server: {
    port: 5174,
    strictPort: true,
    host: true,
  },
  plugins: [cyberguardApiPlugin()],
})