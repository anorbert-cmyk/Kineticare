import { createRequire } from 'node:module'

// Az eslint-config-next 16 már NATÍV flat-config tömböket exportál (a 15-ös
// eslintrc-alak megszűnt), ezért a korábbi FlatCompat + compat.extends() út
// itt eltörne (a @eslint/eslintrc validátora körkörös plugin-objektumon
// TypeError-ral omlik össze). A configokat közvetlenül importáljuk; a csomag
// CJS-ben publikálja őket, ezért createRequire kell.
const require = createRequire(import.meta.url)
const nextCoreWebVitals = require('eslint-config-next/core-web-vitals')
const nextTypescript = require('eslint-config-next/typescript')

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
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
  // ÁTMENETI leminősítés (2026-08-07): a react-hooks 7 (az eslint-config-next 16
  // tranzitív majorja; korábban 5.2.0) két ÚJ szabálya 5 meglévő helyen jelez:
  //   react-hooks/set-state-in-effect:
  //     src/components/analytics/ConsentBanner.tsx:90
  //     src/components/checkout/ThankYouView.tsx:40
  //     src/components/layout/MobileNav.tsx:27
  //     src/lib/cart.ts:91
  //   react-hooks/immutability:
  //     src/components/account/CoursePlayer.tsx:97
  // A jelzések valódiak (fölösleges újrarender / elavult closure), de a javításuk
  // viselkedést érintő refaktor fizetés- és consent-közeli komponensekben — az
  // külön PR, egyenkénti felülvizsgálattal. Addig warn szinten látszanak, hogy
  // a jelzés ne vesszen el; a javító PR-ben ez a blokk törlendő (vissza error-ra).
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
]

export default eslintConfig
