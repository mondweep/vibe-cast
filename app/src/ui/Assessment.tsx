/**
 * The three v1 assessment formats (PRD §6). Every one is graded on what the
 * learner did, never on a self-report, and each reports an Attempt so the
 * scheduler sees performance (ADR 0005).
 */

import { useEffect, useState } from 'react'
import type { Attempt } from '../domain/grading'
import type { AssessmentItem, Lesson } from '../domain/lesson'
import { vec, type Vec2 } from '../domain/geometry'
import { InteractivePlane } from './InteractivePlane'
import { SceneView } from './SceneView'

type ItemResult = { attempt: Attempt }

export const Assessment = ({
  lesson,
  onComplete,
}: {
  lesson: Lesson
  onComplete: (attempts: Attempt[]) => void
}): JSX.Element => {
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<Attempt[]>([])

  const item = lesson.assessment[index]

  const finishItem = (result: ItemResult): void => {
    const next = [...results, result.attempt]
    setResults(next)
    if (index + 1 < lesson.assessment.length) setIndex(index + 1)
    else onComplete(next)
  }

  if (!item) {
    return (
      <section className="assessment">
        <h2>Done</h2>
        <p>You have worked through every question in this lesson.</p>
      </section>
    )
  }

  return (
    <section className="assessment">
      <header>
        <h2>Check yourself</h2>
        <p className="progress-note">
          Question {index + 1} of {lesson.assessment.length}
        </p>
      </header>
      <ItemView key={item.id} item={item} onDone={finishItem} />
    </section>
  )
}

const ItemView = ({ item, onDone }: { item: AssessmentItem; onDone: (r: ItemResult) => void }): JSX.Element => {
  switch (item.kind) {
    case 'predict':
      return <PredictView item={item} onDone={onDone} />
    case 'construct':
      return <ConstructView item={item} onDone={onDone} />
    case 'counterexample':
      return <CounterexampleView item={item} onDone={onDone} />
  }
}

/** Commit first, then watch the animation adjudicate. */
const PredictView = ({
  item,
  onDone,
}: {
  item: Extract<AssessmentItem, { kind: 'predict' }>
  onDone: (r: ItemResult) => void
}): JSX.Element => {
  const [guess, setGuess] = useState<Vec2>(item.initial)
  const [reveal, setReveal] = useState(0)
  const [checked, setChecked] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const distance = Math.hypot(guess.x - item.truth.x, guess.y - item.truth.y)
  const correct = distance <= item.tolerance

  // Animate the reveal from the learner's answer to the truth, so the error
  // itself is what gets animated.
  useEffect(() => {
    if (!checked) return
    let frame = 0
    const start = performance.now()
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / 900)
      setReveal(t)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [checked])

  const check = (): void => {
    setAttempts((n) => n + 1)
    setChecked(true)
  }

  const retry = (): void => {
    setChecked(false)
    setReveal(0)
  }

  return (
    <div className="item">
      <p className="prompt">{item.prompt}</p>
      <InteractivePlane
        scene={item.scene(guess, reveal)}
        handles={[guess]}
        onMove={(_, to) => !checked && setGuess(to)}
        disabled={checked}
        label="Your answer"
      />
      {!checked ? (
        <button type="button" className="primary" onClick={check}>
          Lock it in
        </button>
      ) : (
        <div className={correct ? 'verdict is-right' : 'verdict is-wrong'}>
          <p>
            {correct
              ? 'Right — within tolerance.'
              : `Not quite: you were ${distance.toFixed(2)} units away.`}
          </p>
          <div className="verdict-actions">
            {!correct && (
              <button type="button" onClick={retry}>
                Try again
              </button>
            )}
            <button
              type="button"
              className="primary"
              onClick={() => onDone({ attempt: { correct, attempts, hintsUsed: 0 } })}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Build something meeting a constraint. Graded by predicate, so any valid answer counts. */
const ConstructView = ({
  item,
  onDone,
}: {
  item: Extract<AssessmentItem, { kind: 'construct' }>
  onDone: (r: ItemResult) => void
}): JSX.Element => {
  const [vectors, setVectors] = useState<Vec2[]>([...item.initial])
  const [checked, setChecked] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const verdict = item.satisfies(vectors)

  const move = (index: number, to: Vec2): void => {
    if (checked && verdict.ok) return
    setChecked(false)
    setVectors((current) => current.map((v, i) => (i === index ? to : v)))
  }

  return (
    <div className="item">
      <p className="prompt">{item.prompt}</p>
      <InteractivePlane
        scene={item.scene(vectors)}
        handles={vectors}
        onMove={move}
        label="Arrow"
      />
      {!checked ? (
        <button
          type="button"
          className="primary"
          onClick={() => {
            setAttempts((n) => n + 1)
            setChecked(true)
          }}
        >
          Check
        </button>
      ) : (
        <div className={verdict.ok ? 'verdict is-right' : 'verdict is-wrong'}>
          <p>{verdict.reason}</p>
          <div className="verdict-actions">
            {!verdict.ok && (
              <button type="button" onClick={() => setChecked(false)}>
                Keep trying
              </button>
            )}
            <button
              type="button"
              className="primary"
              onClick={() => onDone({ attempt: { correct: verdict.ok, attempts, hintsUsed: 0 } })}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Find the case that breaks the claim — or establish that none does. */
const CounterexampleView = ({
  item,
  onDone,
}: {
  item: Extract<AssessmentItem, { kind: 'counterexample' }>
  onDone: (r: ItemResult) => void
}): JSX.Element => {
  const [picked, setPicked] = useState<string | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [attempts, setAttempts] = useState(0)

  const claimIsTrue = item.refutedBy.length === 0
  const correct =
    picked === null ? false : claimIsTrue ? picked === 'none' : item.refutedBy.includes(picked)

  return (
    <div className="item">
      <p className="prompt">
        <strong>Claim.</strong> {item.claim}
      </p>
      <p className="sub-prompt">Find a case that breaks it — or decide that none does.</p>

      <ul className="candidates">
        {item.candidates.map((candidate) => (
          <li key={candidate.id}>
            <button
              type="button"
              className={picked === candidate.id ? 'candidate is-picked' : 'candidate'}
              disabled={picked !== null && correct}
              onClick={() => {
                setAttempts((n) => n + 1)
                setPicked(candidate.id)
              }}
            >
              {candidate.label}
            </button>
          </li>
        ))}
      </ul>

      {hintsUsed === 0 && !correct && (
        <button type="button" className="hint-button" onClick={() => setHintsUsed(1)}>
          Give me a hint
        </button>
      )}
      {hintsUsed > 0 && <p className="hint">{item.hint}</p>}

      {picked !== null && (
        <div className={correct ? 'verdict is-right' : 'verdict is-wrong'}>
          <p>{correct ? item.explanation : 'That one does not break the claim. Look again.'}</p>
          <div className="verdict-actions">
            <button
              type="button"
              className="primary"
              onClick={() => onDone({ attempt: { correct, attempts, hintsUsed } })}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export const _unused = { vec, SceneView }
