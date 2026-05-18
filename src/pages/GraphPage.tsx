/**
 * /graph — the concept knowledge graph.
 *
 * Default view shows ~20-30 concept nodes laid out radially. Click a concept
 * to expand: its member words bloom around it. Click again to collapse.
 *
 * Data comes from /api/concepts (one trip on mount) and /api/concepts/:slug
 * (lazy, per click-to-expand).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Search, Sparkles, X } from 'lucide-react';

type ConceptRow = {
  id: string;
  slug: string;
  label: string;
  summary: string | null;
  color: string | null;
  display_order: number;
  word_count: number;
};

type WordRow = {
  id: string;
  devanagari: string;
  iast: string;
  meaning_short: string;
  meaning_full?: string | null;
};

type ExpandedData = { concept: ConceptRow; words: WordRow[] };

// ---------------------------------------------------------------------------
// Custom node components
// ---------------------------------------------------------------------------

type ConceptNodeData = {
  concept: ConceptRow;
  expanded: boolean;
  filtered: boolean;
  onClick: (slug: string) => void;
};

function ConceptNode({ data }: NodeProps<Node<ConceptNodeData>>) {
  const { concept, expanded, filtered, onClick } = data;
  const bg = concept.color || '#5B7FFF';
  return (
    <div
      onClick={() => onClick(concept.slug)}
      className={`px-3 py-2 rounded-xl border cursor-pointer text-center transition-all ${
        filtered ? 'opacity-30' : 'opacity-100'
      } ${expanded ? 'ring-2 ring-amber-300 shadow-lg' : 'hover:ring-2 hover:ring-white/40'}`}
      style={{
        backgroundColor: bg + '20',
        borderColor: bg,
        color: bg,
        minWidth: 120,
        maxWidth: 180,
      }}
      title={concept.summary || undefined}
    >
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      <div className="font-semibold text-sm leading-tight">{concept.label}</div>
      <div className="text-[10px] mt-0.5 opacity-75">{concept.word_count} words</div>
    </div>
  );
}

type WordNodeData = { word: WordRow; parentColor: string };

function WordNode({ data }: NodeProps<Node<WordNodeData>>) {
  return (
    <div
      className="px-2 py-1 rounded-md border text-center text-xs"
      style={{
        backgroundColor: '#1f2937',
        borderColor: data.parentColor + '80',
        color: '#e5e7eb',
        minWidth: 70,
        maxWidth: 130,
      }}
      title={data.word.meaning_short}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div className="font-medium leading-tight">{data.word.iast}</div>
      <div className="text-[9px] mt-0.5 opacity-60 line-clamp-2">
        {data.word.meaning_short}
      </div>
    </div>
  );
}

const nodeTypes = { concept: ConceptNode, word: WordNode };

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

const CENTER_X = 0;
const CENTER_Y = 0;
const CONCEPT_RADIUS = 360;
const WORD_RADIUS = 130;

function layoutConcepts(concepts: ConceptRow[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const n = concepts.length;
  if (n === 0) return positions;
  // Spread concepts on a ring around centre.
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    positions.set(concepts[i].slug, {
      x: CENTER_X + CONCEPT_RADIUS * Math.cos(angle),
      y: CENTER_Y + CONCEPT_RADIUS * Math.sin(angle),
    });
  }
  return positions;
}

function layoutWordsAround(
  centre: { x: number; y: number },
  words: WordRow[],
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const n = words.length;
  if (n === 0) return positions;
  // For up to 20 words, single ring. More than that, multiple rings.
  const perRing = 12;
  for (let i = 0; i < n; i++) {
    const ring = Math.floor(i / perRing);
    const idxInRing = i % perRing;
    const inRing = Math.min(perRing, n - ring * perRing);
    const radius = WORD_RADIUS + ring * 60;
    const angle = (idxInRing / inRing) * 2 * Math.PI + ring * 0.2;
    positions.set(words[i].id, {
      x: centre.x + radius * Math.cos(angle),
      y: centre.y + radius * Math.sin(angle),
    });
  }
  return positions;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function GraphPageInner() {
  const [concepts, setConcepts] = useState<ConceptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Map<string, ExpandedData>>(new Map());
  const [search, setSearch] = useState('');
  const [activeConcept, setActiveConcept] = useState<ConceptRow | null>(null);

  // Initial concept fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('/api/concepts');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!cancelled) setConcepts(data.concepts || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load concepts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Lazy-load a concept's words on first expand.
  const ensureLoaded = useCallback(
    async (slug: string) => {
      if (expanded.has(slug)) return expanded.get(slug)!;
      const resp = await fetch(`/api/concepts/${encodeURIComponent(slug)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = (await resp.json()) as ExpandedData;
      setExpanded((prev) => {
        const next = new Map(prev);
        next.set(slug, data);
        return next;
      });
      return data;
    },
    [expanded],
  );

  const handleConceptClick = useCallback(
    async (slug: string) => {
      const concept = concepts.find((c) => c.slug === slug);
      setActiveConcept(concept || null);
      try {
        await ensureLoaded(slug);
        // Toggle expansion: if already in expanded set, collapse by removing.
        setExpanded((prev) => {
          const next = new Map(prev);
          if (next.has(slug + ':open')) {
            next.delete(slug + ':open');
          } else {
            // mark as open via a sentinel key — actual data is under `slug`
            next.set(slug + ':open', next.get(slug)!);
          }
          return next;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load concept');
      }
    },
    [concepts, ensureLoaded],
  );

  // Build nodes + edges based on current state and search filter
  const conceptPositions = useMemo(() => layoutConcepts(concepts), [concepts]);

  const { nodes, edges } = useMemo(() => {
    const filterQ = search.trim().toLowerCase();
    const conceptNodes: Node[] = concepts.map((c) => {
      const pos = conceptPositions.get(c.slug) || { x: 0, y: 0 };
      const matches =
        !filterQ ||
        c.label.toLowerCase().includes(filterQ) ||
        c.slug.includes(filterQ) ||
        (c.summary || '').toLowerCase().includes(filterQ);
      return {
        id: `concept:${c.id}`,
        type: 'concept',
        position: pos,
        data: {
          concept: c,
          expanded: expanded.has(c.slug + ':open'),
          filtered: !matches,
          onClick: handleConceptClick,
        },
        draggable: true,
      };
    });

    const wordNodes: Node[] = [];
    const edgeList: Edge[] = [];
    for (const c of concepts) {
      const isOpen = expanded.has(c.slug + ':open');
      if (!isOpen) continue;
      const detail = expanded.get(c.slug);
      if (!detail) continue;
      const centre = conceptPositions.get(c.slug) || { x: 0, y: 0 };
      const wordPos = layoutWordsAround(centre, detail.words);
      const color = c.color || '#5B7FFF';
      for (const w of detail.words) {
        const pos = wordPos.get(w.id) || centre;
        wordNodes.push({
          id: `word:${c.id}:${w.id}`,
          type: 'word',
          position: pos,
          data: { word: w, parentColor: color },
          draggable: true,
        });
        edgeList.push({
          id: `e:${c.id}:${w.id}`,
          source: `concept:${c.id}`,
          target: `word:${c.id}:${w.id}`,
          style: { stroke: color + '60', strokeWidth: 1 },
        });
      }
    }
    return { nodes: [...conceptNodes, ...wordNodes], edges: edgeList };
  }, [concepts, conceptPositions, expanded, search, handleConceptClick]);

  const onPaneClick = useCallback(() => {
    setActiveConcept(null);
  }, []);

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    if (node.type === 'concept') {
      // ConceptNode handles its own click via the data.onClick callback,
      // but React Flow may also call this. No-op to avoid double-triggering.
      return;
    }
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-gray-400">
        <Sparkles className="inline mb-3 text-amber-400/60" size={32} />
        <div>Loading concept graph…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-rose-400">
        Failed to load concepts: {error}
      </div>
    );
  }
  if (concepts.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-gray-400 space-y-3">
        <Sparkles className="inline text-amber-400/60" size={36} />
        <div className="text-lg text-gray-200">No concepts yet.</div>
        <p className="text-sm">
          Concepts are generated by running{' '}
          <code className="text-amber-300 bg-gray-900 px-1.5 py-0.5 rounded text-xs">
            npx tsx scripts/cluster_concepts.ts
          </code>{' '}
          against the verified library. Once that runs, refresh this page.
        </p>
      </div>
    );
  }

  return (
    <div className="-m-6 h-[calc(100vh-160px)] relative">
      {/* Search + summary header overlays the graph */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-gray-900/90 backdrop-blur rounded-lg px-3 py-2 border border-gray-800">
        <Search size={14} className="text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter concepts…"
          className="bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none w-48"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-gray-500 hover:text-gray-300">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="absolute top-3 right-3 z-10 bg-gray-900/90 backdrop-blur rounded-lg px-3 py-2 border border-gray-800 text-xs text-gray-400">
        {concepts.length} concepts ·{' '}
        {concepts.reduce((acc, c) => acc + c.word_count, 0)} words ·{' '}
        {[...expanded.keys()].filter((k) => k.endsWith(':open')).length} expanded
      </div>

      {/* Active concept summary */}
      {activeConcept && (
        <div className="absolute bottom-3 left-3 z-10 bg-gray-900/90 backdrop-blur rounded-lg px-4 py-3 border border-gray-800 max-w-md">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: activeConcept.color || '#5B7FFF' }}
            />
            <span className="font-semibold text-gray-100">{activeConcept.label}</span>
            <span className="text-xs text-gray-500">({activeConcept.word_count} words)</span>
          </div>
          {activeConcept.summary && (
            <div className="text-sm text-gray-300 leading-snug">{activeConcept.summary}</div>
          )}
          <div className="text-xs text-gray-500 mt-1.5">
            Click again to{' '}
            {expanded.has(activeConcept.slug + ':open') ? 'collapse' : 'expand'} its words.
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.0}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
      >
        <Background color="#1f2937" gap={24} />
        <Controls className="!bg-gray-900 !border-gray-800" />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'concept') {
              const c = (n.data as ConceptNodeData).concept;
              return c.color || '#5B7FFF';
            }
            return '#4b5563';
          }}
          maskColor="rgba(0,0,0,0.6)"
          className="!bg-gray-900 !border-gray-800"
        />
      </ReactFlow>
    </div>
  );
}

export function GraphPage() {
  return (
    <ReactFlowProvider>
      <GraphPageInner />
    </ReactFlowProvider>
  );
}
