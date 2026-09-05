import { describe, expect, it } from 'vitest'
import { rate, rateLesson, type Attempt } from './grading'

const attempt = (over: Partial<Attempt> = {}): Attempt =>
  ({ correct: true, attempts: 1, hintsUsed: 0, ...over })

describe('rate', () => {
  it('is "again" whenever the learner got it wrong, however few hints they took', () => {
    expect(rate(attempt({ correct: false }))).toBe('again')
    expect(rate(attempt({ correct: false, attempts: 1, hintsUsed: 0 }))).toBe('again')
  })

  it('is "easy" only for first-time, unaided success', () => {
    expect(rate(attempt())).toBe('easy')
  })

  it('drops to "good" when a hint or a second attempt was needed', () => {
    expect(rate(attempt({ hintsUsed: 1 }))).toBe('good')
    expect(rate(attempt({ attempts: 2 }))).toBe('good')
  })

  it('drops to "hard" when the answer was ground out', () => {
    expect(rate(attempt({ attempts: 4 }))).toBe('hard')
    expect(rate(attempt({ hintsUsed: 3 }))).toBe('hard')
  })
})

describe('rateLesson', () => {
  it('takes the weakest item, because mastery means all of it', () => {
    expect(rateLesson([attempt(), attempt(), attempt({ correct: false })])).toBe('again')
    expect(rateLesson([attempt(), attempt({ attempts: 2 })])).toBe('good')
  })

  it('is "easy" only when every item was easy', () => {
    expect(rateLesson([attempt(), attempt()])).toBe('easy')
  })

  it('treats a lesson with nothing attempted as unlearned', () => {
    expect(rateLesson([])).toBe('again')
  })
})
