/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const ReactCompilerConfig = {};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    (react as any)({
      babel: {
        plugins: [
          ["babel-plugin-react-compiler", ReactCompilerConfig],
        ],
      },
    }),
    tailwindcss(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['server/**', 'node_modules/**'],
    css: true,
  },
  server: {
    watch: {
      ignored: ['**/piston/**']
    }
  },
  // Bundle optimization
  build: {
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 500,
    
    // Optimize dependencies
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('lucide-react') || id.includes('sonner')) {
              return 'vendor-ui';
            }
            if (id.includes('@monaco-editor/react')) {
              return 'vendor-monaco';
            }
            if (id.includes('axios') || id.includes('socket.io-client') || id.includes('date-fns')) {
              return 'vendor-utils';
            }
            if (id.includes('dompurify')) {
              return 'vendor-purify';
            }
            // Other node_modules
            return 'vendor-other';
          }
          
          // Feature chunks
          if (id.includes('/features/terminal/')) {
            return 'features-terminal';
          }
          if (id.includes('/features/auth/')) {
            return 'features-auth';
          }
          
          // Page chunks (lazy loaded)
          if (id.includes('/pages/Battle.tsx')) {
            return 'page-battle';
          }
          if (id.includes('/pages/Terminal.tsx')) {
            return 'page-terminal';
          }
          if (id.includes('/pages/Dashboard.tsx')) {
            return 'page-dashboard';
          }
          if (id.includes('/pages/Problems.tsx')) {
            return 'page-problems';
          }
          if (id.includes('/pages/Lobby.tsx')) {
            return 'page-lobby';
          }
          if (id.includes('/pages/DataStructureDetail.tsx') || id.includes('/pages/DataStructureDirectory.tsx')) {
            return 'page-ds';
          }
          if (id.includes('/pages/admin/')) {
            return 'page-admin';
          }
        },
        
        // Asset naming for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    
    // Minification
    minify: 'esbuild',
    target: 'es2020',
    
    // Source maps for debugging (disabled in production for smaller bundles)
    sourcemap: false,
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Report compressed size
    reportCompressedSize: true,
  },
  
  // Dependency optimization
  optimizeDeps: {
    // Pre-bundle these dependencies
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      'sonner',
      'axios',
      'socket.io-client',
      'date-fns',
    ],
    
    // Exclude heavy dependencies that are lazy-loaded
    exclude: [
      '@monaco-editor/react',
      'dompurify',
    ],
  },
  
  // Monaco editor configuration - only include languages we use
  define: {
    // Tell @monaco-editor/react which languages to bundle
    'process.env.MONACO_LANGUAGES': JSON.stringify([
      'javascript', 'typescript', 'python', 'java', 'cpp', 'c'
    ]),
  },
  
  // Resolve aliases
  resolve: {
    alias: {
      // Ensure single instance of react
      'react': 'react',
      'react-dom': 'react-dom',
    },
  },
})