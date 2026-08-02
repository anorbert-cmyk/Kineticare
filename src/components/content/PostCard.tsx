import Link from 'next/link'

import type { Category, Post } from '../../payload-types'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { MediaImage } from './MediaImage'

/**
 * PostCard — blogposzt-kártya (borító / cím / kivonat / dátum / kategóriák).
 * A /blog/<slug> útvonalra mutat; csak published poszttal renderel.
 */
export interface PostCardProps {
  post: Pick<
    Post,
    'id' | 'title' | 'slug' | 'excerpt' | 'heroImage' | 'publishedAt' | 'categories' | 'status'
  >
}

/** Magyar dátumformázás (pl. 2025. március 4.); érvénytelen/hiányzó dátumra null. */
export function formatPostDate(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return new Intl.DateTimeFormat('hu-HU', { dateStyle: 'long' }).format(date)
}

function categoryTitles(categories: Post['categories']): string[] {
  if (!Array.isArray(categories)) return []
  return categories
    .filter((cat): cat is Category => typeof cat === 'object' && cat !== null)
    .map((cat) => cat.title)
    .filter((title): title is string => typeof title === 'string' && title.length > 0)
}

export function PostCard({ post }: PostCardProps) {
  if (post.status !== 'published' || !post.slug) {
    return null
  }

  const date = formatPostDate(post.publishedAt)
  const titles = categoryTitles(post.categories)
  const heroMedia = post.heroImage && typeof post.heroImage === 'object' ? post.heroImage : null

  return (
    <Card as="article" className="kc-post-card" interactive padded={false}>
      <Link className="kc-post-card__link" href={`/blog/${post.slug}`}>
        {heroMedia ? (
          <span className="kc-post-card__cover">
            <MediaImage media={heroMedia} preferredSize="sm" sizes="(max-width: 720px) 100vw, 352px" />
          </span>
        ) : null}
        <span className="kc-post-card__body">
          {titles.length > 0 ? (
            <span className="kc-post-card__categories">
              {titles.map((title) => (
                <Badge key={title} tone="info">
                  {title}
                </Badge>
              ))}
            </span>
          ) : null}
          <span className="kc-post-card__title">{post.title}</span>
          {post.excerpt ? <span className="kc-post-card__excerpt">{post.excerpt}</span> : null}
          {date ? (
            <span className="kc-post-card__date">
              <time dateTime={typeof post.publishedAt === 'string' ? post.publishedAt : undefined}>
                {date}
              </time>
            </span>
          ) : null}
        </span>
      </Link>
    </Card>
  )
}
