import { useMemo, useState } from 'react'
import type { Lesson } from '../domain/lesson'
import { describeScene } from '../domain/scene'
import { SceneView } from './SceneView'
import { Assessment } from './Assessment'
import { usePrefersReducedMotion, useScrollProgress } from './useScrollProgress'
import { lessonById } from '../content'
import type { Attempt } from '../domain/grading'

/**
 * Discrete steps for the reduced-motion path. The same scene builder is used,
 * so the two paths cannot drift apart (ADR 0002).
 */
const STILLS = [0, 0.5, 1] as const

export const LessonView = ({
  lesson,
  onComplete,
  onBack,
}: {
  lesson: Lesson
  onComplete: (attempts: Attempt[]) => void
  onBack: () => void
}): JSX.Element => {
  const sectionIds = useMemo(() => lesson.sections.map((s) => s.id), [lesson])
  const progress = useScrollProgress(sectionIds)
  const reducedMotion = usePrefersReducedMotion()
  const [inset, setInset] = useState<string | null>(null)

  const active = lesson.sections[progress?.sectionIndex ?? 0] ?? lesson.sections[0]!
  const scene = active.scene(progress?.withinSection ?? 0)
  const insetLesson = inset ? lessonById(inset) : undefined

  if (reducedMotion) {
    return (
      <article className="lesson lesson--still">
        <LessonHeader lesson={lesson} onBack={onBack} />
        <p className="notice">
          Reduced motion is on, so each step is shown as a still rather than an animation.
        </p>
        {lesson.sections.map((section) => (
          <section key={section.id} className="still-section">
            <h2>{section.heading}</h2>
            {section.prose.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <div className="still-strip">
              {STILLS.map((t) => (
                <SceneView key={t} scene={section.scene(t)} />
              ))}
            </div>
          </section>
        ))}
        <Assessment lesson={lesson} onComplete={onComplete} />
      </article>
    )
  }

  return (
    <article className="lesson">
      <LessonHeader lesson={lesson} onBack={onBack} />

      <div className="lesson-body" data-lesson-body>
        <div className="lesson-figure">
          <div className="figure-pin">
            <SceneView scene={scene} />
            {insetLesson && (
              <div className="hyperframe" role="dialog" aria-label={`${insetLesson.title} — prerequisite`}>
                <div className="hyperframe-head">
                  <span>{insetLesson.title}</span>
                  <button type="button" onClick={() => setInset(null)} aria-label="Close inset">
                    ×
                  </button>
                </div>
                <SceneView scene={insetLesson.sections[0]!.scene(1)} />
                <p className="hyperframe-note">{insetLesson.summary}</p>
              </div>
            )}
            <p className="visually-hidden" aria-live="polite">
              {describeScene(scene)}
            </p>
          </div>
        </div>

        <div className="lesson-prose">
          {lesson.sections.map((section) => (
            <section
              key={section.id}
              data-section={section.id}
              className={section.id === active.id ? 'prose-section is-active' : 'prose-section'}
            >
              <h2>{section.heading}</h2>
              {section.prose.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {section.inset && (
                <button
                  type="button"
                  className="inset-trigger"
                  onClick={() => setInset(section.inset ?? null)}
                >
                  Remind me: {lessonById(section.inset)?.title ?? section.inset}
                </button>
              )}
            </section>
          ))}
        </div>
      </div>

      <Assessment lesson={lesson} onComplete={onComplete} />
    </article>
  )
}

const LessonHeader = ({ lesson, onBack }: { lesson: Lesson; onBack: () => void }): JSX.Element => (
  <header className="lesson-head">
    <button type="button" className="link-button" onClick={onBack}>
      ← All concepts
    </button>
    <h1>{lesson.title}</h1>
    <p className="summary">{lesson.summary}</p>
    <p className="citation">
      Companion article <strong>{lesson.pcm}</strong> — read it for the full treatment.
    </p>
  </header>
)
