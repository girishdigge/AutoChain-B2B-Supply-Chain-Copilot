/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react({
      // Fix for React 19 compatibility
      jsxRuntime: 'automatic',
    }),
    tailwindcss(),
  ],
  define: {
    // Ensure React is available globally in production
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Performance optimizations
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: process.env.NODE_ENV === 'development',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Simplified chunk splitting to fix React bundling issues
        manualChunks: {
          // Keep React together in one chunk
          'react-vendor': ['react', 'react-dom', 'react-dom/client'],
          // Other vendor libraries
          vendor: ['framer-motion', 'lucide-react', 'recharts', 'sonner'],
        },
        // Optimize chunk file names with better hashing
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId
                .split('/')
                .pop()
                ?.replace(/\.[^/.]+$/, '')
            : 'chunk';
          return `js/${facadeModuleId}-[hash:8].js`;
        },
        entryFileNames: 'js/[name]-[hash:8].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext || '')) {
            return `images/[name]-[hash:8][extname]`;
          }
          if (/css/i.test(ext || '')) {
            return `css/[name]-[hash:8][extname]`;
          }
          if (/woff2?|ttf|eot/i.test(ext || '')) {
            return `fonts/[name]-[hash:8][extname]`;
          }
          return `assets/[name]-[hash:8][extname]`;
        },
      },
      // Don't externalize React - keep it bundled
      external: [],
    },
    // Optimize bundle size and performance
    chunkSizeWarningLimit: 800,
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB
    reportCompressedSize: false, // Disable gzip size reporting for faster builds
  },

  // Optimize dependencies - force React to be included
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router-dom',
      'framer-motion',
      'lucide-react',
      'recharts',
      'clsx',
      'class-variance-authority',
      'tailwind-merge',
      'sonner',
    ],
    force: true, // Force re-optimization
  },

  // Development server configuration
  server: {
    hmr: {
      overlay: false, // Disable error overlay for better performance
    },
  },

  // Enhanced esbuild configuration
  esbuild: {
    // Remove console.log in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Optimize for modern browsers
    target: 'esnext',
    // Enable legal comments for licenses
    legalComments: 'none',
  },

  // CSS optimization
  css: {
    devSourcemap: process.env.NODE_ENV === 'development',
    preprocessorOptions: {
      // Add any CSS preprocessor options here
    },
  },
  // Test configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
    },
  },
});
