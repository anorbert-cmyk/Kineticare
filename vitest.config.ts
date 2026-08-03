/**
 * vitest-konfiguráció.
 *
 * Az esbuild.jsx: 'automatic' azért kell, mert a React 19 automatikus
 * JSX-runtime-ját használó komponensek (a content- és lexical-komponensek)
 * renderToStaticMarkup-pel tesztelhetők legyenek külön @jsxImportSource
 * pragma nélkül. A meglévő teszteket nem bontja (72/72 zöld maradt).
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
  },
})
