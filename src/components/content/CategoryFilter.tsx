import Link from 'next/link'

import type { Category } from '../../payload-types'

/**
 * CategoryFilter — a blog kategória-szűrője (tabletta-linkek).
 *
 * Az „Összes" a /blog listára, a kategóriák a dedikált /blog/kategoria/<slug>
 * oldalra mutatnak (SEO-barát, megosztható URL). Server component — a szűrés
 * a lekérdezésben történik, kliens JS nélkül.
 */
export interface CategoryFilterProps {
  categories: Pick<Category, 'id' | 'title' | 'slug'>[]
  /** Az aktív kategória slugja (lista-oldalon undefined). */
  activeSlug?: string
}

export function CategoryFilter({ categories, activeSlug }: CategoryFilterProps) {
  if (categories.length === 0) {
    return null
  }
  return (
    <nav aria-label="Kategória-szűrő" className="kc-category-filter">
      <ul className="kc-category-filter__list">
        <li>
          <Link
            aria-current={activeSlug === undefined ? 'page' : undefined}
            className={`kc-category-filter__chip${activeSlug === undefined ? ' kc-category-filter__chip--active' : ''}`}
            href="/blog"
          >
            Összes
          </Link>
        </li>
        {categories.map((category) => {
          const active = category.slug === activeSlug
          return (
            <li key={category.id}>
              <Link
                aria-current={active ? 'page' : undefined}
                className={`kc-category-filter__chip${active ? ' kc-category-filter__chip--active' : ''}`}
                href={`/blog/kategoria/${category.slug}`}
              >
                {category.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
