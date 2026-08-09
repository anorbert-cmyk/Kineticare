import type { MetadataRoute } from 'next'

import {
  HOME_PAGE_SLUG,
  getAllPublishedPages,
  getContentCategories,
  getPosts,
  getPublishedProducts,
} from '@/lib/cms'
import { courseHref } from '@/lib/course-url'
import { absoluteUrl } from '@/lib/seo'

/**
 * sitemap.xml — a Next.js metadata-API generálja (`/sitemap.xml`).
 *
 * `force-dynamic`: a sitemap a CMS-ből épül, ezért NEM generálható build-időben.
 * A CI-ben (és bármely DB nélküli buildnél) a lekérdezés amúgy is üres listát
 * adna vissza — az a sitemap pedig hetekig kint ragadna. Kérésidőben generálva
 * mindig a valós, aktuális tartalom kerül bele.
 *
 * A `getAll*` lekérdezések a cms.ts `safeQuery` burkolójában futnak: DB-hiba
 * esetén üres listát adnak és naplóznak, tehát a sitemap sosem 500-azik —
 * legfeljebb a statikus útvonalakat tartalmazza.
 */
export const dynamic = 'force-dynamic'

/** Statikus, mindig létező storefront-útvonalak. */
const STATIC_ROUTES: ReadonlyArray<{ path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }> = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/kurzusok', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.8, changeFrequency: 'daily' },
  { path: '/kapcsolat', priority: 0.5, changeFrequency: 'monthly' },
]

/** A doc `updatedAt` mezője Date-ként; hiányzó/érvénytelen érték esetén undefined. */
function lastModified(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, posts, categories, products] = await Promise.all([
    getAllPublishedPages(),
    getPosts({ limit: 500 }),
    getContentCategories(),
    getPublishedProducts(500),
  ])

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  // CMS-oldalak — a kezdőlap kimarad, mert a `/` már a statikus listában van.
  for (const page of pages) {
    if (page.slug === HOME_PAGE_SLUG) {
      continue
    }
    entries.push({
      url: absoluteUrl(`/${page.slug}`),
      lastModified: lastModified(page.updatedAt),
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  }

  for (const post of posts) {
    entries.push({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: lastModified(post.updatedAt),
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  for (const category of categories) {
    entries.push({
      url: absoluteUrl(`/blog/kategoria/${category.slug}`),
      changeFrequency: 'weekly',
      priority: 0.5,
    })
  }

  // A kurzus KANONIKUS címe a slug (C3); slug nélküli, régi terméknél marad az
  // id-alapú út — a sitemapbe így sosem kerül átirányított (301-es) URL.
  for (const product of products) {
    entries.push({
      url: absoluteUrl(courseHref(product)),
      lastModified: lastModified(product.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.9,
    })
  }

  return entries
}
