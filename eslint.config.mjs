import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // A `.claude/**` az ügynök-worktree-ké: a repó teljes másolatát tartalmazza,
    // lintelve minden találat duplán jelenne meg.
    ignores: ['node_modules/**', '.next/**', 'dist/**', 'coverage/**', '.claude/**'],
  },
  // A migrációs fájlokat a Payload migrációs eszköze generálja, és a 3. tilos
  // zóna szerint kézzel nem szerkeszthetők. A generált up/down szignatúrák
  // `payload` és `req` paramétere üres migrációkban használatlan marad, ezért
  // itt kivesszük őket a no-unused-vars ellenőrzés alól — a valós figyelmeztetések
  // (pl. nem használt lokális változó) továbbra is megmaradnak.
  {
    files: ['src/migrations/**'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^(payload|req)$' }],
    },
  },
]

export default eslintConfig
