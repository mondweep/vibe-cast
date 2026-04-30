"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";

// ── Types ─────────────────────────────────────────────────────
interface GNode {
  id: string;
  label: string;
  type: string;
  description: string;
  module_ids: string[];
  // D3 simulation adds these:
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  relation: string;
  weight: number;
  // D3 replaces string ids with node refs:
  source?: GNode | string;
  target?: GNode | string;
}

// ── Colour map by node type ───────────────────────────────────
const NODE_COLOUR: Record<string, string> = {
  AWSService:  "#f59e0b",
  Concept:     "#3b82f6",
  Pattern:     "#10b981",
  ExamTopic:   "#f97316",
  Module:      "#8b5cf6",
  Protocol:    "#06b6d4",
  Lesson:      "#6b7280",
};

const NODE_RADIUS: Record<string, number> = {
  Module:      18,
  ExamTopic:   14,
  AWSService:  12,
  Pattern:     11,
  Concept:     10,
  Protocol:    9,
  Lesson:      8,
};

// ── Component ─────────────────────────────────────────────────
export function KnowledgeGraph() {
  const svgRef    = useRef<SVGSVGElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const simRef    = useRef<d3.Simulation<GNode, GEdge> | null>(null);

  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [selected, setSelected] = useState<GNode | null>(null);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<string>("All");
  const [stats,    setStats]    = useState({ nodes: 0, edges: 0 });

  const buildGraph = useCallback((nodes: GNode[], edges: GEdge[]) => {
    const svg = d3.select(svgRef.current!);
    svg.selectAll("*").remove();

    const W = wrapRef.current!.clientWidth;
    const H = wrapRef.current!.clientHeight;

    // ── Root group (for zoom/pan) ──────────────────────────────
    const root = svg.append("g").attr("class", "root");

    // ── Zoom behaviour ─────────────────────────────────────────
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3])
      .on("zoom", e => root.attr("transform", e.transform));
    svg.call(zoom);

    // ── Arrow marker ───────────────────────────────────────────
    const defs = svg.append("defs");
    const types = [...new Set(edges.map(e => e.relation))];
    types.forEach(rel => {
      defs.append("marker")
        .attr("id", `arrow-${rel}`)
        .attr("viewBox", "0 -4 8 8")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-4L8,0L0,4")
        .attr("fill", "#475569");
    });

    // ── D3 force simulation ────────────────────────────────────
    const sim = d3.forceSimulation<GNode>(nodes)
      .force("link", d3.forceLink<GNode, GEdge>(edges)
        .id(d => d.id)
        .distance(d => {
          const s = (d.source as GNode).type;
          const t = (d.target as GNode).type;
          if (s === "Module" || t === "Module") return 120;
          return 80;
        })
        .strength(0.4)
      )
      .force("charge", d3.forceManyBody().strength(-180))
      .force("center",  d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide<GNode>(d => (NODE_RADIUS[d.type] ?? 10) + 4));

    simRef.current = sim;

    // ── Edges ──────────────────────────────────────────────────
    const link = root.append("g").attr("class", "edges")
      .selectAll<SVGLineElement, GEdge>("line")
      .data(edges)
      .join("line")
        .attr("stroke", "#334155")
        .attr("stroke-width", d => Math.max(0.5, (d.weight ?? 1) * 1.5))
        .attr("stroke-opacity", 0.6)
        .attr("marker-end", d => `url(#arrow-${d.relation})`);

    // ── Nodes ──────────────────────────────────────────────────
    const node = root.append("g").attr("class", "nodes")
      .selectAll<SVGGElement, GNode>("g")
      .data(nodes)
      .join("g")
        .attr("cursor", "pointer")
        .call(
          d3.drag<SVGGElement, GNode>()
            .on("start", (e, d) => {
              if (!e.active) sim.alphaTarget(0.3).restart();
              d.fx = d.x; d.fy = d.y;
            })
            .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
            .on("end", (e, d) => {
              if (!e.active) sim.alphaTarget(0);
              d.fx = null; d.fy = null;
            })
        );

    // Circle
    node.append("circle")
      .attr("r", d => NODE_RADIUS[d.type] ?? 10)
      .attr("fill", d => NODE_COLOUR[d.type] ?? "#6b7280")
      .attr("fill-opacity", 0.9)
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 1.5);

    // Label (only for larger nodes)
    node.filter(d => (NODE_RADIUS[d.type] ?? 0) >= 11)
      .append("text")
        .text(d => d.label.length > 18 ? d.label.slice(0, 16) + "…" : d.label)
        .attr("dy", d => (NODE_RADIUS[d.type] ?? 10) + 10)
        .attr("text-anchor", "middle")
        .attr("font-size", "9px")
        .attr("font-family", "monospace")
        .attr("fill", "#94a3b8")
        .attr("pointer-events", "none");

    // ── Click to select ────────────────────────────────────────
    node.on("click", (e, d) => {
      e.stopPropagation();
      setSelected(d);

      // Highlight neighbourhood
      const neighbourIds = new Set<string>([d.id]);
      edges.forEach(edge => {
        const s = (edge.source as GNode).id;
        const t = (edge.target as GNode).id;
        if (s === d.id) neighbourIds.add(t);
        if (t === d.id) neighbourIds.add(s);
      });

      node.selectAll<SVGCircleElement, GNode>("circle")
        .attr("fill-opacity", n => neighbourIds.has(n.id) ? 1 : 0.15)
        .attr("stroke-width",  n => n.id === d.id ? 3 : 1.5)
        .attr("stroke",        n => n.id === d.id ? "#fff" : "#0f172a");

      link
        .attr("stroke-opacity", (edge: GEdge) => {
          const s = (edge.source as GNode).id;
          const t = (edge.target as GNode).id;
          return s === d.id || t === d.id ? 1 : 0.05;
        })
        .attr("stroke", (edge: GEdge) => {
          const s = (edge.source as GNode).id;
          const t = (edge.target as GNode).id;
          return s === d.id || t === d.id ? "#f59e0b" : "#334155";
        })
        .attr("stroke-width", (edge: GEdge) => {
          const s = (edge.source as GNode).id;
          const t = (edge.target as GNode).id;
          return s === d.id || t === d.id ? 2 : Math.max(0.5, (edge.weight ?? 1) * 1.5);
        });
    });

    // Deselect on background click
    svg.on("click", () => {
      setSelected(null);
      node.selectAll<SVGCircleElement, GNode>("circle")
        .attr("fill-opacity", 0.9)
        .attr("stroke-width", 1.5)
        .attr("stroke", "#0f172a");
      link
        .attr("stroke-opacity", 0.6)
        .attr("stroke", "#334155")
        .attr("stroke-width", d => Math.max(0.5, (d.weight ?? 1) * 1.5));
    });

    // Tooltip on hover
    node.append("title")
      .text(d => `${d.label}\n${d.type}\n${d.description}`);

    // ── Tick ──────────────────────────────────────────────────
    sim.on("tick", () => {
      link
        .attr("x1", d => (d.source as GNode).x ?? 0)
        .attr("y1", d => (d.source as GNode).y ?? 0)
        .attr("x2", d => (d.target as GNode).x ?? 0)
        .attr("y2", d => (d.target as GNode).y ?? 0);

      node.attr("transform", d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Initial zoom-to-fit after simulation settles
    sim.on("end", () => {
      const bounds = (root.node() as SVGGElement).getBBox();
      const scale  = Math.min(0.9, Math.min(W / bounds.width, H / bounds.height));
      const tx     = (W - bounds.width  * scale) / 2 - bounds.x * scale;
      const ty     = (H - bounds.height * scale) / 2 - bounds.y * scale;
      svg.transition().duration(600)
        .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    });

  }, []);

  // ── Load data from API ────────────────────────────────────────
  useEffect(() => {
    fetch("/api/graph")
      .then(r => r.json())
      .then(({ nodes, edges, error: apiErr }) => {
        if (apiErr) throw new Error(apiErr);
        setStats({ nodes: nodes.length, edges: edges.length });
        buildGraph(nodes, edges);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message ?? "Failed to load graph");
        setLoading(false);
      });
  }, [buildGraph]);

  // ── Search highlight ─────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return;
    const q = search.toLowerCase().trim();
    d3.select(svgRef.current)
      .selectAll<SVGCircleElement, GNode>("g.nodes g circle")
      .attr("fill-opacity", (d: GNode) =>
        !q || d.label.toLowerCase().includes(q) ? 0.9 : 0.1
      );
  }, [search]);

  // ── Filter by type ───────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll<SVGCircleElement, GNode>("g.nodes g circle")
      .attr("fill-opacity", (d: GNode) =>
        filter === "All" || d.type === filter ? 0.9 : 0.1
      );
  }, [filter]);

  return (
    <div ref={wrapRef} className="w-full h-full relative bg-[#050c18]">

      {/* Controls overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        {/* Search */}
        <input
          type="text"
          placeholder="Search nodes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-44 bg-card/80 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 backdrop-blur-sm"
        />
        {/* Type filter */}
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-44 bg-card/80 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50 backdrop-blur-sm"
        >
          {["All","AWSService","Concept","Pattern","ExamTopic","Module","Protocol"].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Stats badge */}
      {!loading && (
        <div className="absolute top-3 right-3 z-10 bg-card/80 border border-border rounded-lg px-3 py-1.5 text-[10px] font-mono text-muted-foreground backdrop-blur-sm">
          {stats.nodes} nodes · {stats.edges} edges
        </div>
      )}

      {/* Selected node panel */}
      {selected && (
        <div className="absolute bottom-4 left-4 z-10 w-72 bg-card/95 border border-border rounded-xl p-4 backdrop-blur-sm shadow-xl">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-sm font-bold text-foreground">{selected.label}</p>
              <span
                className="inline-block text-[10px] font-mono px-1.5 py-0.5 rounded mt-0.5"
                style={{
                  backgroundColor: (NODE_COLOUR[selected.type] ?? "#6b7280") + "20",
                  color: NODE_COLOUR[selected.type] ?? "#6b7280",
                  border: `1px solid ${NODE_COLOUR[selected.type] ?? "#6b7280"}40`,
                }}
              >
                {selected.type}
              </span>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-muted-foreground hover:text-foreground text-lg leading-none shrink-0"
            >×</button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {selected.description}
          </p>
          {selected.module_ids?.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-2 font-mono">
              Appears in modules: M{selected.module_ids.join(", M")}
            </p>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-muted-foreground font-mono">Loading knowledge graph…</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-red-400 font-mono">Error: {error}</p>
        </div>
      )}

      {/* D3 canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: "grab" }}
      />
    </div>
  );
}
