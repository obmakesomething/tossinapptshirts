import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

/**
 * Renders the React Native screens in a browser.
 *
 * Toss host modules are swapped for inert stand-ins so the screens run
 * unmodified — the point is to review the real components, not a copy.
 */
export default defineConfig({
  root: here,
  plugins: [react()],
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.jsx', '.js'],
    alias: [
      // Exact match only: a prefix alias also rewrites react-native/Libraries/*
      // subpaths, which react-native-web does not provide.
      // Bare specifier, not a path: an aliased filesystem path skips dependency
      // optimisation, and react-native-web's CJS deps then reach the browser raw.
      { find: /^react-native$/, replacement: 'react-native-web' },
      { find: '@granite-js/react-native', replacement: path.resolve(here, 'mocks/granite.tsx') },
      { find: '@apps-in-toss/framework', replacement: path.resolve(here, 'mocks/appsInToss.ts') },
      { find: '@apps-in-toss/native-modules', replacement: path.resolve(here, 'mocks/appsInToss.ts') },
      { find: '@toss/tds-react-native', replacement: path.resolve(here, 'mocks/tds.tsx') },
      { find: 'pages', replacement: path.resolve(root, 'src/pages') },
      { find: 'components', replacement: path.resolve(root, 'src/components') },
    ],
  },
  optimizeDeps: {
    // react-native-web and its CJS internals must be pre-bundled, or the
    // browser gets raw CommonJS and fails on a missing default export.
    include: [
      'react-native-web',
      '@react-native/normalize-colors',
      'inline-style-prefixer',
      'react',
      'react-dom/client',
    ],
    // Native-only transitive packages. Nothing in src/ imports them, and the
    // scanner chokes on their native internals.
    exclude: [
      'react-native-gesture-handler',
      'react-native-svg',
      'react-native-pager-view',
      'react-native-image-picker',
      '@toss/tds-react-native',
      '@apps-in-toss/framework',
      '@apps-in-toss/native-modules',
      '@granite-js/react-native',
    ],
  },
  server: { port: 5188, host: '127.0.0.1' },
  define: { __DEV__: 'true', global: 'globalThis' },
});
