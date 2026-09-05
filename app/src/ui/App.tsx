import { useCallback, useEffect, useMemo, useState } from 'react'
import { lessons } from '../content'
import { createLocalProgressStore } from '../adapters/local-progress-store'
import { createFsrsScheduler } from '../adapters/fsrs-scheduler'
import { systemClock } from '../ports/clock'
import { EMPTY_PROGRESS, type Progress } from '../ports/progress-store'
import { createStudyService } from '../domain/study'
import { MASTERY_THRESHOLD, missingPrerequisites, suggestedOrder } from '../domain/graph'
import type { Attempt } from '../domain/grading'
import { LessonView } from './LessonView'

// Until sign-in lands (issue #31) progress is per-browser under a fixed id.
const LOCAL_USER = 'local'

const store = createLocalProgressStore()
const study = createStudyService({ store, scheduler: createFsrsScheduler(), clock: systemClock })

export const App = (): JSX.Element => {
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS)
  const [openLessonId, setOpenLessonId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void (async () => {
      setProgress(await store.load(LOCAL_USER))
      setLoaded(true)
    })()
  }, [])

  const ordered = useMemo(() => suggestedOrder(lessons), [])
  const mastery = study.masteryState(progress)
  const due = study.dueForReview(progress)
  const nextUp = study.nextUp(ordered, progress)
  const openLesson = ordered.find((l) => l.id === openLessonId)

  const complete = useCallback(
    async (attempts: Attempt[]) => {
      if (!openLessonId) return
      setProgress(await study.completeLesson(LOCAL_USER, openLessonId, attempts))
      setOpenLessonId(null)
      window.scrollTo({ top: 0 })
    },
    [openLessonId],
  )

  if (openLesson) {
    return (
      <main className="shell">
        <LessonView lesson={openLesson} onComplete={complete} onBack={() => setOpenLessonId(null)} />
      </main>
    )
  }

  return (
    <main className="shell">
      <header className="home-head">
        <p className="eyebrow">A visual companion</p>
        <h1>The Visual Mathematical Dictionary</h1>
        <p className="lede">
          Concepts from <em>The Princeton Companion to Mathematics</em>, each explained by something
          that moves — then tested by asking you to do mathematics rather than recall sentences
          about it.
        </p>
      </header>

      {loaded && due.length > 0 && (
        <section className="review-banner">
          <h2>Due for review</h2>
          <p>
            {due.length} concept{due.length === 1 ? '' : 's'} you are starting to forget. Reviewing
            now is worth more than starting something new.
          </p>
        </section>
      )}

      {nextUp && (
        <section className="next-up">
          <h2>Next up</h2>
          <button type="button" className="primary big" onClick={() => setOpenLessonId(nextUp.id)}>
            {due.includes(nextUp.id) ? 'Review' : 'Start'}: {nextUp.title}
          </button>
        </section>
      )}

      <section className="concepts">
        <h2>All concepts</h2>
        <ol className="concept-list">
          {ordered.map((lesson) => {
            const level = mastery.get(lesson.id) ?? 0
            const missing = missingPrerequisites(lesson, mastery)
            return (
              <li key={lesson.id} className="concept">
                <button type="button" className="concept-button" onClick={() => setOpenLessonId(lesson.id)}>
                  <span className="concept-title">{lesson.title}</span>
                  <span className="concept-pcm">{lesson.pcm}</span>
                  <span className="concept-summary">{lesson.summary}</span>
                  <span className="mastery" aria-label={`Mastery ${Math.round(level * 100)} percent`}>
                    <span className="mastery-bar" style={{ width: `${Math.round(level * 100)}%` }} />
                  </span>
                  <span className="concept-state">
                    {level >= MASTERY_THRESHOLD
                      ? `Mastered — ${Math.round(level * 100)}%`
                      : level > 0
                        ? `Fading — ${Math.round(level * 100)}%`
                        : 'Not started'}
                  </span>
                </button>
                {missing.length > 0 && (
                  <p className="advisory">
                    You will get more from this after: {missing.join(', ')}. You can still read it now.
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      <footer className="home-foot">
        <p className="credit">
          Created and orchestrated by{' '}
          <a
            href="https://www.linkedin.com/in/mondweepchakravorty"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mondweep Chakravorty
          </a>
          . Questions and suggestions are welcome — do get in touch.
        </p>
        <p>
          Explanations, diagrams and questions here are written from scratch and cite{' '}
          <em>The Princeton Companion to Mathematics</em> rather than reproducing it. Article
          numbers link the two so you can read the original.
        </p>
      </footer>
    </main>
  )
}
