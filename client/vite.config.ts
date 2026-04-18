import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBasePath = env.VITE_API_BASE_URL || '/api'
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3000'
  const assetCdn = env.VITE_ASSET_CDN || '/'
  const proxy =
    apiBasePath.startsWith('/') && apiProxyTarget
      ? {
          [apiBasePath]: {
            target: apiProxyTarget,
            changeOrigin: true,
          },
        }
      : undefined

  return {
    base: assetCdn,
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy,
    },
  }
})
