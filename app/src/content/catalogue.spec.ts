import { describe, expect, it } from 'vitest'
import { articlesWithLessons, lessonCount, parts, totalArticles } from './catalogue'
import { lessons } from './index'

describe('catalogue', () => {
  it('covers the whole Companion, not just what has been written', () => {
    expect(totalArticles).toBe(288)
    expect(parts).toHaveLength(8)
  })

  it('gives every part a blurb written for this app', () => {
    for (const part of parts) expect(part.blurb.length).toBeGreaterThan(20)
  })

  it('reaches every lesson from the map', () => {
    expect(lessonCount()).toBe(lessons.length)
    const reachable = articlesWithLessons().flatMap((a) => a.lessons.map((l) => l.id))
    expect(new Set(reachable)).toEqual(new Set(lessons.map((l) => l.id)))
  })

  it('lets one article carry several lessons', () => {
    // I.3 alone defines groups, fields, vector spaces, metric spaces and
    // manifolds — far more than a single lesson's worth.
    const shared = articlesWithLessons().filter((a) => a.lessons.length > 1)
    expect(shared.length).toBeGreaterThan(0)
    expect(articlesWithLessons().length).toBeLessThan(lessons.length)
  })

  it('never lists an article twice', () => {
    const ids = parts.flatMap((p) => p.articles.map((a) => a.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps the biographical lifespans with Part VI, where they belong', () => {
    const withLifespans = parts.filter((p) => p.articles.some((a) => a.lived))
    expect(withLifespans.map((p) => p.id)).toEqual(['VI'])
  })
})
