import { describe, expect, it } from 'vitest'

import { slugify } from '../lib/slugify'

describe('slugify', () => {
  it('magyar ékezetes karaktereket kezel', () => {
    expect(slugify('Kézrehabilitáció Ősszel Űrtávírő')).toBe('kezrehabilitacio-osszel-urtaviro')
  })

  it('összevonta kötőjeleket és levágja a széleket', () => {
    expect(slugify('  Hello   World!! ')).toBe('hello-world')
  })

  it('már slug-formátumú értéket változatlanul hagy', () => {
    expect(slugify('bemutatkozas')).toBe('bemutatkozas')
  })
})
