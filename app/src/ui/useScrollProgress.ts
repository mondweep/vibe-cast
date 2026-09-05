/**
 * The DOM half of the scroll engine (ADR 0002). Its only job is to measure
 * geometry and hand it to the pure model. Native scrolling is never touched.
 */

import { useEffect, useRef, useState } from 'react'
import { computeProgress, type LessonProgress, type SectionGeometry } from '../domain/scroll'

export const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export const useScrollProgress = (sectionIds: readonly string[]): LessonProgress | null => {
  const [progress, setProgress] = useState<LessonProgress | null>(null)
  const frame = useRef(0)
  const visible = useRef(false)
  const container = useRef<HTMLElement | null>(null)

  useEffect(() => {
    container.current = document.querySelector('[data-lesson-body]')

    const measure = (): SectionGeometry[] =>
      sectionIds.flatMap((id) => {
        const el = document.querySelector<HTMLElement>(`[data-section="${id}"]`)
        if (!el) return []
        const rect = el.getBoundingClientRect()
        return [{ id, top: rect.top + window.scrollY, height: rect.height }]
      })

    // Progress is read in a rAF loop rather than a scroll handler, and the loop
    // parks itself whenever the lesson is off screen.
    const tick = (): void => {
      if (visible.current) {
        setProgress(computeProgress(window.scrollY, window.innerHeight, measure()))
      }
      frame.current = requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        visible.current = entries.some((entry) => entry.isIntersecting)
      },
      { rootMargin: '100px' },
    )
    if (container.current) observer.observe(container.current)
    else visible.current = true

    frame.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame.current)
      observer.disconnect()
    }
  }, [sectionIds])

  return progress
}
