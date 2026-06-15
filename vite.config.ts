import { defineConfig } from 'vite'
import { cyberguardApiPlugin } from './server/viteApiPlugin.js'

export default defineConfig({
  server: {
    port: 5000,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  plugins: [cyberguardApiPlugin()],
})
