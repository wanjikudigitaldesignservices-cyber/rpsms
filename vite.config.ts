import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: {
      'process.env.DATABASE_URL': JSON.stringify(env.DATABASE_URL || ''),
      'process.env.DATABASE_URL_UNPOOLED': JSON.stringify(env.DATABASE_URL_UNPOOLED || ''),
      'process.env.NEON_BRANCH': JSON.stringify(env.NEON_BRANCH || 'production'),
      'process.env.NEON_AUTH_BASE_URL': JSON.stringify(env.NEON_AUTH_BASE_URL || ''),
      'process.env.NEON_AUTH_JWKS_URL': JSON.stringify(env.NEON_AUTH_JWKS_URL || ''),
      'process.env.NEON_FUNCTION_HELLO_BASE_URL': JSON.stringify(env.NEON_FUNCTION_HELLO_BASE_URL || ''),
      'process.env.AWS_ACCESS_KEY_ID': JSON.stringify(env.AWS_ACCESS_KEY_ID || ''),
      'process.env.AWS_SECRET_ACCESS_KEY': JSON.stringify(env.AWS_SECRET_ACCESS_KEY || ''),
      'process.env.AWS_ENDPOINT_URL_S3': JSON.stringify(env.AWS_ENDPOINT_URL_S3 || ''),
      'process.env.AWS_REGION': JSON.stringify(env.AWS_REGION || 'us-east-2'),
      'process.env.NEON_REALTIME_URL': JSON.stringify(env.NEON_REALTIME_URL || ''),
      'process.env.NEON_REALTIME_SECRET': JSON.stringify(env.NEON_REALTIME_SECRET || ''),
    },
  }
})
