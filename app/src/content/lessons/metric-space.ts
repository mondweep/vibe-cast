import { ease, lerpVec2, vec, type Vec2 } from '../../domain/geometry'
import type { Lesson } from '../../domain/lesson'
import type { Mark, SceneState } from '../../domain/scene'

const EXTENT = 5

/** A handful of documents, placed so that closeness means "about the same thing". */
const CORPUS: { id: string; label: string; at: Vec2 }[] = [
  { id: 'invoice', label: 'invoice', at: vec(-2.4, 1.9) },
  { id: 'receipt', label: 'receipt', at: vec(-1.5, 2.5) },
  { id: 'payment', label: 'payment terms', at: vec(-2.9, 0.9) },
  { id: 'holiday', label: 'holiday policy', at: vec(2.6, -1.6) },
  { id: 'sickpay', label: 'sick pay', at: vec(3.1, -2.6) },
  { id: 'onboarding', label: 'onboarding', at: vec(1.9, -2.9) },
]

const euclid = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y)
const taxicab = (a: Vec2, b: Vec2): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

const nearest = (query: Vec2, distance: (a: Vec2, b: Vec2) => number) =>
  CORPUS.reduce((best, doc) => (distance(query, doc.at) < distance(query, best.at) ? doc : best), CORPUS[0]!)

const docMarks = (highlight?: string): Mark[] =>
  CORPUS.map((doc) => ({
    kind: 'point',
    id: doc.id,
    at: doc.at,
    label: doc.label,
    emphasis: doc.id === highlight ? 'focus' : 'normal',
  }))

const grid = (): Mark => ({
  kind: 'grid',
  id: 'grid',
  extent: EXTENT,
  transform: [
    [1, 0],
    [0, 1],
  ],
})

/** Documents scattered, then the two clusters become obvious. */
const placement = (t: number): SceneState => {
  const p = ease(t)
  return {
    extent: EXTENT,
    marks: [
      grid(),
      ...docMarks(),
      ...(p > 0.55
        ? [
            { kind: 'label' as const, id: 'money', at: vec(-2.2, 3.6), text: 'money things' },
            { kind: 'label' as const, id: 'people', at: vec(2.6, -3.9), text: 'people things' },
          ]
        : []),
    ],
    caption:
      p < 0.55
        ? 'Six documents, placed by what they are about rather than what words they contain.'
        : 'Nothing labelled them. They cluster because closeness in this space was built to mean similarity in meaning.',
  }
}

/** A query point, and the circle of "how near is near" growing until it catches something. */
const search = (t: number): SceneState => {
  const query = vec(-1.9, 1.0)
  const hit = nearest(query, euclid)
  const radius = ease(t) * 2.4
  const found = radius >= euclid(query, hit.at)
  // A ring of points standing in for the search radius.
  const ring: Mark[] = Array.from({ length: 40 }, (_, i) => {
    const angle = (i / 40) * Math.PI * 2
    return {
      kind: 'point',
      id: `ring-${i}`,
      at: vec(query.x + Math.cos(angle) * radius, query.y + Math.sin(angle) * radius),
      emphasis: 'muted',
    }
  })
  return {
    extent: EXTENT,
    marks: [grid(), ...ring, ...docMarks(found ? hit.id : undefined), { kind: 'point', id: 'query', at: query, label: 'your question', emphasis: 'focus' }],
    caption: found
      ? `Nearest match: "${hit.label}". No keyword in your question had to appear in it.`
      : 'Search outward from the question until something is close enough.',
  }
}

/** The same points, a different notion of distance, a different answer. */
const whichDistance = (t: number): SceneState => {
  const query = vec(-0.1, 0.15)
  const useTaxicab = ease(t) > 0.5
  const hit = nearest(query, useTaxicab ? taxicab : euclid)
  return {
    extent: EXTENT,
    marks: [
      grid(),
      ...docMarks(hit.id),
      { kind: 'point', id: 'query', at: query, label: 'your question', emphasis: 'focus' },
      { kind: 'line', id: 'link', through: query, direction: vec(hit.at.x - query.x, hit.at.y - query.y), emphasis: 'muted' },
    ],
    caption: useTaxicab
      ? `Measuring along the grid instead of straight across: nearest is now "${hit.label}".`
      : `Measuring straight-line distance: nearest is "${hit.label}".`,
  }
}

/** A term that was never placed. The system answers anyway. */
const missing = (t: number): SceneState => {
  const p = ease(t)
  const drifting = lerpVec2(vec(0, 4.4), vec(-2.1, 2.1), p)
  const landed = p > 0.85
  return {
    extent: EXTENT,
    marks: [
      grid(),
      ...docMarks(landed ? 'invoice' : undefined),
      { kind: 'point', id: 'query', at: drifting, label: '"Project Kestrel"', emphasis: 'focus' },
      ...(landed
        ? [{ kind: 'label' as const, id: 'note', at: vec(0, -4.3), text: 'confident, and wrong' }]
        : []),
    ],
    caption: landed
      ? 'It has no place here, so it lands near whatever happens to be closest — and the system reports that with no hesitation at all.'
      : 'A term the space has never seen: an internal codename, an acronym, a product only you use.',
  }
}

export const metricSpace: Lesson = {
  id: 'metric-space',
  pcm: 'III.56',
  title: 'Metric Spaces',
  summary: 'How a machine finds the right document without matching a single word — and exactly how that goes wrong inside your organisation.',
  prerequisites: [],

  sections: [
    {
      id: 'placement',
      heading: 'Meaning becomes a position',
      prose: [
        'A metric space is a set of things plus a rule for how far apart any two of them are. That is the whole definition. The rule has to behave sensibly — nothing is a negative distance from anything, the distance from A to B equals the distance from B to A, and going via C is never a shortcut — but beyond that you are free.',
        'The freedom is the point. Once you can place documents so that distance means dissimilarity, "find me something relevant" becomes "find me something nearby", and nearby is a thing a computer is extremely good at.',
        'Watch the two clusters form. Nobody tagged these documents. They sit where they sit because the space was constructed so that position carries meaning.',
      ],
      scene: placement,
    },
    {
      id: 'search',
      heading: 'Search becomes geometry',
      prose: [
        'Now ask a question. It gets a position too, and the system expands outward from it until it catches something.',
        'This is why a search for "staff leaving" can return a document titled "attrition" that shares not one word with the query. The words were never being compared. The positions were.',
        'Every retrieval-augmented system in your organisation — every "chat with your documents" product on the market — is doing this underneath.',
      ],
      scene: search,
    },
    {
      id: 'which',
      heading: 'Near is a choice, not a fact',
      prose: [
        'Here is what people miss. There is no single correct notion of distance. Straight-line distance is one rule. Distance measured along the grid, as a taxi drives, is another equally valid one — and it answers the same question differently.',
        'Watch the answer change while the documents do not move at all. Same corpus, same query, different metric, different result. Neither is a bug.',
        'So when a vendor says their system finds the most relevant document, the question underneath is: relevant according to which rule? They chose one. Do you know which, and does it match how your business judges relevance?',
      ],
      scene: whichDistance,
    },
    {
      id: 'missing',
      heading: 'What was never placed',
      prose: [
        'And here is the failure that will actually bite you. The space was built from language the model saw during training. Your product codenames, your three-letter acronyms, the internal name for the billing system nobody outside finance understands — none of them were there.',
        'They have no position. So when someone asks about one, the query lands wherever the surrounding words drag it, and the system returns the nearest thing it can find with complete confidence.',
        'There is no error state for this. Distance is always defined; something is always nearest. A metric space cannot tell you that the right answer was never in it.',
      ],
      scene: missing,
    },
  ],

  assessment: [
    {
      kind: 'construct',
      id: 'construct-nearest',
      prompt: 'Move the first marker so that "sick pay" — bottom right — becomes its nearest document.',
      initial: [vec(-3.5, 3.5), vec(3.1, -2.6)],
      satisfies: (vectors) => {
        const query = vectors[0]
        if (!query) return { ok: false, reason: 'Move the query marker.' }
        const hit = nearest(query, euclid)
        return hit.id === 'sickpay'
          ? { ok: true, reason: 'Nearest is now "sick pay" — you moved the question, not the documents.' }
          : { ok: false, reason: `Nearest is still "${hit.label}". Get closer to the people-things cluster.` }
      },
      scene: (vectors) => {
        const query = vectors[0] ?? vec(0, 0)
        const hit = nearest(query, euclid)
        return {
          extent: EXTENT,
          marks: [
            grid(),
            ...docMarks(hit.id),
            { kind: 'point', id: 'query', at: query, label: 'your question', emphasis: 'focus' },
            { kind: 'line', id: 'link', through: query, direction: vec(hit.at.x - query.x, hit.at.y - query.y), emphasis: 'muted' },
          ],
          caption: `Nearest right now: "${hit.label}".`,
        }
      },
    },
    {
      kind: 'counterexample',
      id: 'counter-transitive',
      claim: 'If document A is close to B, and B is close to C, then A is close to C.',
      candidates: [
        { id: 'chain', label: 'A chain of documents, each near the next, spanning the whole space' },
        { id: 'cluster', label: 'Three documents all inside one tight cluster' },
        { id: 'identical', label: 'Three copies of the same document' },
        { id: 'none', label: 'No counterexample — the claim is true' },
      ],
      refutedBy: ['chain'],
      hint: 'The rules of a metric space forbid a shortcut through C. They say nothing about a long way round.',
      explanation:
        'The chain breaks it. "Near" does not chain: the triangle inequality guarantees that going via B is never shorter than going direct, which is the opposite of what you would need. Step through enough near-neighbours and you can travel from invoices to sick pay without any single step looking wrong. This is exactly how a multi-hop retrieval system drifts off topic while every individual hop looks defensible — and why chained retrieval needs evaluating end to end, not step by step.',
    },
  ],
}
