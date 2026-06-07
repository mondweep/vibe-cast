import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import { Loader, Search, X, BookOpen, FileCode } from 'lucide-react';
import { useKnowledgeGraph } from '@/hooks/useKnowledgeGraph';
import type { KGNode } from '@/api/knowledgeGraph';

// Visual metadata per node kind (the 6 kinds in the Ruflo knowledge graph).
const KIND_META: Record<string, { label: string; color: string }> = {
  command: { label: 'CLI command', color: '#2563eb' },
  mcp_tool: { label: 'MCP tool', color: '#16a34a' },
  agent_type: { label: 'Agent type', color: '#9333ea' },
  topology: { label: 'Topology', color: '#ea580c' },
  concept: { label: 'Concept', color: '#0891b2' },
  pattern: { label: 'Pattern', color: '#db2777' },
};
const kindColor = (kind: string) => KIND_META[kind]?.color || '#94a3b8';

export function KnowledgeGraphPage() {
  const { data, isLoading, isError } = useKnowledgeGraph();
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dims, setDims] = useState({ width: 800, height: 560 });
  const [search, setSearch] = useState('');
  const [activeKinds, setActiveKinds] = useState<Set<string>>(new Set(Object.keys(KIND_META)));
  const [selected, setSelected] = useState<KGNode | null>(null);

  // Size the canvas to its container (responsive).
  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (el) setDims({ width: el.clientWidth, height: el.clientHeight });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isLoading]);

  const toggleKind = (kind: string) => {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  };

  // Build the filtered graph (fresh objects so the force layout re-seeds cleanly).
  const graphData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };
    const q = search.trim().toLowerCase();
    const nodes = data.nodes.filter(
      (n) => activeKinds.has(n.kind) && (!q || n.name.toLowerCase().includes(q) || (n.summary || '').toLowerCase().includes(q)),
    );
    const keep = new Set(nodes.map((n) => n.id));
    const links = data.edges
      .filter((e) => keep.has(e.source as string) && keep.has(e.target as string))
      .map((e) => ({ ...e }));
    return { nodes: nodes.map((n) => ({ ...n })), links };
  }, [data, search, activeKinds]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader className="animate-spin text-primary-600" size={36} />
      </div>
    );
  }
  if (isError || !data) {
    return <p className="text-gray-600">Couldn't load the knowledge graph. Please try again.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Graph</h1>
          <p className="text-gray-600 text-sm mt-1">
            The Ruflo concept map powering the tutor — {data.counts.nodes} concepts, {data.counts.edges} relationships,
            grounded in the real Ruflo source. Drag to explore, scroll to zoom, click a node for detail.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search concepts…"
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full sm:w-64"
          />
        </div>
      </div>

      {/* Legend / kind filters */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(KIND_META).map(([kind, meta]) => {
          const on = activeKinds.has(kind);
          return (
            <button
              key={kind}
              onClick={() => toggleKind(kind)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition ${
                on ? 'bg-white border-gray-300 text-gray-700' : 'bg-gray-100 border-gray-200 text-gray-400 line-through'
              }`}
              title={on ? 'Click to hide' : 'Click to show'}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color, opacity: on ? 1 : 0.4 }} />
              {meta.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Graph canvas */}
        <div
          ref={containerRef}
          className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden h-[60vh] min-h-[440px]"
        >
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            width={dims.width}
            height={dims.height}
            cooldownTicks={120}
            nodeRelSize={4}
            nodeLabel={(n: any) => `${n.name} (${KIND_META[n.kind]?.label || n.kind})`}
            linkColor={() => 'rgba(148,163,184,0.35)'}
            linkDirectionalArrowLength={2.5}
            linkDirectionalArrowRelPos={1}
            linkLabel={(l: any) => l.relation}
            onNodeClick={(n: any) => setSelected(n as KGNode)}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, scale: number) => {
              const isSel = selected?.id === node.id;
              ctx.beginPath();
              ctx.arc(node.x, node.y, isSel ? 6 : 4, 0, 2 * Math.PI, false);
              ctx.fillStyle = kindColor(node.kind);
              ctx.fill();
              if (isSel) {
                ctx.lineWidth = 2 / scale;
                ctx.strokeStyle = '#111827';
                ctx.stroke();
              }
              if (scale >= 1.3 || isSel) {
                const fontSize = 11 / scale;
                ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
                ctx.fillStyle = '#1f2937';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(node.name, node.x, node.y + 6);
              }
            }}
            nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
              ctx.beginPath();
              ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
              ctx.fillStyle = color;
              ctx.fill();
            }}
          />
        </div>

        {/* Detail panel */}
        <div className="lg:w-80 flex-shrink-0">
          {selected ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 sticky top-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className="inline-block text-xs font-medium px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: kindColor(selected.kind) }}
                  >
                    {KIND_META[selected.kind]?.label || selected.kind}
                  </span>
                  <h2 className="text-lg font-semibold text-gray-900 mt-1.5 break-words">{selected.name}</h2>
                </div>
                <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
                  <X size={16} />
                </button>
              </div>

              {selected.summary && <p className="text-sm text-gray-700 leading-relaxed">{selected.summary}</p>}

              {selected.lessons?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Taught in</p>
                  <ul className="space-y-1">
                    {selected.lessons.map((l) => (
                      <li key={l.id}>
                        <Link
                          to={`/lessons/${l.id}`}
                          className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
                        >
                          <BookOpen size={14} /> Lesson {l.order}: {l.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selected.sourceRefs?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Source</p>
                  <ul className="space-y-1">
                    {selected.sourceRefs.slice(0, 5).map((s, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600 font-mono break-all">
                        <FileCode size={13} className="flex-shrink-0 mt-0.5 text-gray-400" />
                        {s.file}
                        {s.lines ? `:${s.lines}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500 sticky top-4">
              Click any node to see its summary, the lessons that teach it, and its source references.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KnowledgeGraphPage;
