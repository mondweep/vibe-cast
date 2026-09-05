/**
 * The whole Companion, as a browsable map.
 *
 * Lessons are hand-authored and there are far fewer of them than there are
 * articles. Rather than hide that, the catalogue lists every article and marks
 * which ones have a lesson — so the map of the subject is complete from day one
 * and the gaps are visible rather than implied.
 */

import curriculum from '../../../data/curriculum.json'
import type { Lesson } from '../domain/lesson'
import { lessons } from './index'

export type Article = {
  readonly id: string
  readonly title: string
  /** Lifespan, for the biographical entries in Part VI. */
  readonly lived?: string
  /**
   * Lessons citing this article. Several can share one — I.3 alone defines
   * groups, fields, vector spaces, metric spaces and manifolds, which is far
   * more than one lesson's worth.
   */
  readonly lessons: readonly Lesson[]
}

export type Part = {
  readonly id: string
  readonly title: string
  readonly blurb: string
  readonly articles: readonly Article[]
}

/**
 * One line per part saying what it is for, written here rather than taken from
 * the book. Keyed by part number.
 */
const BLURBS: Record<string, string> = {
  I: 'What mathematics is about, the language it is written in, and the objects everything else is built from.',
  II: 'How the modern subject came to be — number systems, abstraction, rigour, and the crisis in the foundations.',
  III: 'The working vocabulary. Ninety-nine concepts a mathematician reaches for without explanation.',
  IV: 'The branches themselves, each surveyed by someone who works in it.',
  V: 'The results worth knowing about, from Fermat to the halting problem.',
  VI: 'The people, in order of birth.',
  VII: 'Where the subject touches everything else — networks, cryptography, medicine, money, music.',
  VIII: 'Closing arguments on what mathematics is for and how it gets done.',
}

type RawPart = {
  id: string
  title: string
  articles: { id: string; title: string; lived?: string }[]
}

const lessonsFor = (articleId: string): readonly Lesson[] =>
  lessons.filter((lesson) => lesson.pcm === articleId)

export const parts: readonly Part[] = (curriculum.parts as RawPart[]).map((part) => ({
  id: part.id,
  title: part.title,
  blurb: BLURBS[part.id] ?? '',
  articles: part.articles.map((article) => ({
    id: article.id,
    title: article.title,
    ...(article.lived ? { lived: article.lived } : {}),
    lessons: lessonsFor(article.id),
  })),
}))

export const totalArticles = parts.reduce((sum, part) => sum + part.articles.length, 0)

/** Articles that carry at least one lesson, in curriculum order. */
export const articlesWithLessons = (): readonly Article[] =>
  parts.flatMap((part) => part.articles.filter((article) => article.lessons.length > 0))

/** How many lessons exist across the whole catalogue. */
export const lessonCount = (): number =>
  parts.reduce((sum, part) => sum + part.articles.reduce((n, a) => n + a.lessons.length, 0), 0)

export const source = curriculum.source as {
  title: string
  editor: string
  publisher: string
  year: number
}
