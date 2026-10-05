import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    cors: true,
    proxy: {
      // 注意：iqdb.org 在明文 HTTP 上会直接 301 跳转到 HTTPS，
      // 因此 target 必须用 https，否则代理层拿到的是跳转页而不是搜索结果。
      '/iqdb': {
        target: 'https://iqdb.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/iqdb/, '')
      },
      '/trace': {
        target: 'https://api.trace.moe',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/trace/, '')
      }
    }
  }
})
