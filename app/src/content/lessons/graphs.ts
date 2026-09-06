import { ease, vec, type Vec2 } from '../../domain/geometry'
import type { Lesson } from '../../domain/lesson'
import type { Mark, SceneState } from '../../domain/scene'

const EXTENT = 5

type Node = { id: string; label: string; at: Vec2 }

const SYSTEM: Node[] = [
  { id: 'inbox', label: 'inbox agent', at: vec(-3.2, 2.4) },
  { id: 'summary', label: 'summariser', at: vec(0, 3.0) },
  { id: 'crm', label: 'CRM', at: vec(3.2, 2.0) },
  { id: 'files', label: 'file store', at: vec(-3.4, -0.6) },
  { id: 'search', label: 'search', at: vec(-0.4, 0.2) },
  { id: 'send', label: 'outbound email', at: vec(3.0, -1.4) },
  { id: 'hr', label: 'HR records', at: vec(-1.8, -3.0) },
]

const EDGES: [string, string][] = [
  ['inbox', 'summary'],
  ['summary', 'crm'],
  ['inbox', 'search'],
  ['search', 'files'],
  ['search', 'hr'],
  ['crm', 'send'],
  ['summary', 'send'],
]

const nodeAt = (id: string): Vec2 => SYSTEM.find((n) => n.id === id)!.at

const nodeMarks = (highlight: readonly string[] = []): Mark[] =>
  SYSTEM.map((n) => ({
    kind: 'point',
    id: n.id,
    at: n.at,
    label: n.label,
    emphasis: highlight.includes(n.id) ? 'focus' : 'normal',
  }))

const edgeMarks = (highlight: readonly string[] = [], shown = EDGES.length): Mark[] =>
  EDGES.slice(0, shown).map(([from, to], i) => ({
    kind: 'segment',
    id: `e-${i}`,
    from: nodeAt(from),
    to: nodeAt(to),
    emphasis: highlight.includes(from) && highlight.includes(to) ? 'focus' : 'muted',
  }))

/** Nodes first, then the connections that make it a system. */
const structure = (t: number): SceneState => {
  const shown = Math.round(ease(t) * EDGES.length)
  return {
    extent: EXTENT,
    marks: [...edgeMarks([], shown), ...nodeMarks()],
    caption:
      shown === 0
        ? 'Seven components. As a list, this is an inventory.'
        : shown < EDGES.length
          ? 'Add the connections and it stops being a list.'
          : 'A graph: things, and what reaches what. The connections carry information the inventory never did.',
  }
}

/** Every node talking to every other: the cost of attention. */
const allPairs = (t: number): SceneState => {
  const n = 3 + Math.round(ease(t) * 4)
  const ring = SYSTEM.slice(0, n)
  const edges: Mark[] = []
  for (let i = 0; i < ring.length; i += 1) {
    for (let j = i + 1; j < ring.length; j += 1) {
      edges.push({ kind: 'segment', id: `p-${i}-${j}`, from: ring[i]!.at, to: ring[j]!.at, emphasis: 'muted' })
    }
  }
  return {
    extent: EXTENT,
    marks: [
      ...edges,
      ...ring.map((node) => ({ kind: 'point' as const, id: node.id, at: node.at, emphasis: 'focus' as const })),
      { kind: 'label', id: 'n', at: vec(0, -4.3), text: `${n} items · ${(n * (n - 1)) / 2} connections` },
    ],
    caption: `Connect everything to everything and the count grows as the square. ${n} items already need ${(n * (n - 1)) / 2} links.`,
  }
}

/** Reachability: follow the arrows and see where you end up. */
const reachable = (t: number): SceneState => {
  const depth = ease(t)
  const path = depth > 0.75 ? ['inbox', 'search', 'hr'] : depth > 0.4 ? ['inbox', 'search'] : ['inbox']
  return {
    extent: EXTENT,
    marks: [
      ...edgeMarks(path),
      ...nodeMarks(path),
      { kind: 'label', id: 'note', at: vec(0, -4.3), text: path.length === 3 ? 'two hops from the inbox to HR records' : 'follow the connections' },
    ],
    caption:
      path.length === 3
        ? 'Nobody granted the inbox agent access to HR records. The graph granted it, two hops away, and no single permission looks wrong.'
        : 'Start at whatever an attacker or a confused agent can touch first.',
  }
}

/** The whole reachable set from one entry point. */
const blastRadius = (t: number): SceneState => {
  const p = ease(t)
  const lit = p > 0.6 ? ['inbox', 'summary', 'search', 'crm', 'files', 'hr', 'send'] : p > 0.25 ? ['inbox', 'summary', 'search'] : ['inbox']
  return {
    extent: EXTENT,
    marks: [
      ...edgeMarks(lit),
      ...nodeMarks(lit),
      { kind: 'label', id: 'n', at: vec(0, -4.3), text: `${lit.length} of 7 components reachable` },
    ],
    caption:
      lit.length === 7
        ? 'Everything. One compromised entry point reaches the file store, HR records and outbound email — including the ability to send.'
        : 'Keep following. This is the blast radius, and it is a property of the graph rather than of any component.',
  }
}

export const graphs: Lesson = {
  id: 'graphs',
  pcm: 'III.34',
  title: 'Graphs',
  summary: 'Things and what connects them — the structure behind attention, agent architectures, and the security question nobody asks.',
  prerequisites: [],

  sections: [
    {
      id: 'structure',
      heading: 'A graph is things plus connections',
      prose: [
        'That is the whole definition: a set of things, and a record of which pairs are joined. Mathematicians call them vertices and edges; you can call them components and dependencies.',
        'The definition is almost insultingly simple, and the reason graphs are everywhere is that almost everything interesting is a set of things with relationships. Road networks, org charts, supply chains, permission models, the components of an AI system.',
        'Watch the connections appear. The seven components did not change. What changed is that you can now ask questions no inventory could answer.',
      ],
      scene: structure,
    },
    {
      id: 'all-pairs',
      heading: 'Connecting everything is expensive',
      prose: [
        'Now connect everything to everything. The link count grows as the square of the number of things: ten items need forty-five links, a hundred need nearly five thousand.',
        'This is exactly the attention mechanism at the heart of a modern language model. Every token is connected to every other token, so the model can relate any word to any other regardless of distance — and the cost grows quadratically with the length of the input.',
        'That quadratic is why long context windows were hard, why they are priced the way they are, and why "just put the whole document in the prompt" has a cost curve that bends sharply upwards rather than a linear one. It is not a vendor pricing trick. It is the shape of a complete graph.',
      ],
      scene: allPairs,
    },
    {
      id: 'reachable',
      heading: 'Reachability is not the same as permission',
      prose: [
        'Here is the question a graph answers and a permissions table does not: what can get from here to there?',
        'Follow two hops. The inbox agent can call search. Search can read HR records. Nobody granted the inbox agent access to HR records, and every individual permission was signed off by somebody sensible.',
        'Each edge is defensible. The path is not. And paths are what an attacker — or a confused agent following instructions from a malicious email — actually traverses.',
      ],
      scene: reachable,
    },
    {
      id: 'blast',
      heading: 'The blast radius belongs to the graph',
      prose: [
        'Keep following and the reachable set closes over almost everything: the file store, HR records, and outbound email, which means the ability to send as well as read.',
        'Nobody designed that. It emerged from seven reasonable decisions taken at different times, and it is invisible in any document that lists components rather than connections.',
        'The practical instruction is short. When someone presents an agent architecture, do not review the boxes. Draw the edges, pick the least trustworthy entry point, and ask what is reachable from it. That question has a definite answer, it is cheap to compute, and it is the one that governance reviews almost always skip.',
      ],
      scene: blastRadius,
    },
  ],

  assessment: [
    {
      kind: 'counterexample',
      id: 'counter-reachability',
      claim: 'If every individual connection in our system has been security-reviewed, the system is secure.',
      candidates: [
        { id: 'audited', label: 'Every component has passed its own audit' },
        { id: 'path', label: 'Two safe connections form a path from an untrusted input to sensitive data' },
        { id: 'encrypted', label: 'Every connection is encrypted in transit' },
        { id: 'none', label: 'No counterexample — the claim is true' },
      ],
      refutedBy: ['path'],
      hint: 'Review the edges one at a time and you will never see the thing that only exists when you follow two of them.',
      explanation:
        'The path breaks it, and it is the defining failure mode of agent systems. Security is not a property that composes: two individually safe edges create a route that neither review considered, because each reviewer saw only their own edge. This is how prompt injection escalates — an untrusted email reaches a summariser, which reaches a search tool, which reaches records nobody intended to expose. The fix is not more edge reviews. It is computing the reachable set from each untrusted entry point, which is a graph question with a definite answer.',
    },
    {
      kind: 'predict',
      id: 'predict-edges',
      prompt: 'Twelve items, all connected to each other. Drag the marker up the bar to show how many connections that needs — the top of the bar is 100.',
      initial: vec(0, -4),
      truth: vec(0, ((12 * 11) / 2 / 100) * 8 - 4),
      tolerance: 0.9,
      scene: (guess, reveal) => {
        const clamped = Math.max(-4, Math.min(4, guess.y))
        const stated = Math.round(((clamped + 4) / 8) * 100)
        return {
          extent: EXTENT,
          marks: [
            { kind: 'segment', id: 'bar', from: vec(0, -4), to: vec(0, 4), label: '100', emphasis: 'muted' },
            { kind: 'label', id: 'zero', at: vec(0, -4.5), text: '0' },
            { kind: 'point', id: 'guess', at: vec(0, clamped), label: `${stated} connections`, emphasis: 'focus' },
            ...(reveal > 0.3
              ? [{ kind: 'point' as const, id: 'truth', at: vec(1.8, ((12 * 11) / 2 / 100) * 8 - 4), label: '66 — and 24 items would need 276', emphasis: 'focus' as const }]
              : []),
          ],
          caption: reveal > 0.3 ? 'Doubling the items nearly quadruples the connections. That is the shape of every attention-cost curve.' : 'How many links to connect twelve things to each other?',
        }
      },
    },
  ],
}
