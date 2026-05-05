"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { DEFI_NODES, DEFI_EDGES, NodeType } from "@/lib/knowledge/defi-ontology";

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: NodeType;
  description: string;
  fx?: number;
  fy?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  relation: string;
  weight?: number;
}

const NODE_COLORS: Record<NodeType, string> = {
  Protocol: "#3B82F6",
  Concept: "#10B981",
  Strategy: "#F59E0B",
  Token: "#EC4899",
  Risk: "#EF4444",
  Metric: "#8B5CF6",
  Phase: "#06B6D4",
  Skill: "#14B8A6",
};

const NODE_SIZES: Record<NodeType, number> = {
  Protocol: 25,
  Concept: 20,
  Strategy: 18,
  Token: 16,
  Risk: 22,
  Metric: 16,
  Phase: 18,
  Skill: 16,
};

export function KnowledgeGraphViewer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<NodeType | "all">("all");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Transform ontology to graph format
    const nodes: GraphNode[] = DEFI_NODES.map((n, i) => ({
      id: `node-${i}`,
      label: n.label,
      type: n.type,
      description: n.description,
      x: Math.random() * 800,
      y: Math.random() * 600,
    }));

    const nodeMap = new Map(DEFI_NODES.map((n, i) => [n.label, `node-${i}`]));

    const links: GraphLink[] = DEFI_EDGES
      .map((edge) => {
        const sourceId = nodeMap.get(edge.from);
        const targetId = nodeMap.get(edge.to);
        if (!sourceId || !targetId) return null;

        const source = nodes.find((n) => n.id === sourceId)!;
        const target = nodes.find((n) => n.id === targetId)!;

        return {
          source,
          target,
          relation: edge.relation,
          weight: edge.weight || 1,
        };
      })
      .filter((l) => l !== null) as GraphLink[];

    // Filter nodes and links based on selected type
    let filteredNodes = nodes;
    let filteredLinks = links;

    if (filterType !== "all") {
      filteredNodes = nodes.filter((n) => n.type === filterType);
      const nodeIds = new Set(filteredNodes.map((n) => n.id));
      filteredLinks = links.filter(
        (l) =>
          nodeIds.has((l.source as GraphNode).id) &&
          nodeIds.has((l.target as GraphNode).id)
      );
    }

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Add zoom
    const g = svg.append("g");

    svg.call(
      d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
        g.attr("transform", event.transform);
      })
    );

    // Force simulation
    const simulation = d3
      .forceSimulation(filteredNodes)
      .force(
        "link",
        d3
          .forceLink(filteredLinks)
          .id((d: any) => d.id)
          .distance(100)
          .strength(0.1)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(40));

    // Render links
    const link = g
      .append("g")
      .selectAll("line")
      .data(filteredLinks)
      .enter()
      .append("line")
      .attr("stroke", (d: any) => {
        const opacity = hoveredNode
          ? (d.source.id === hoveredNode || d.target.id === hoveredNode) ? 1 : 0.2
          : 0.4;
        return `rgba(209, 213, 219, ${opacity})`;
      })
      .attr("stroke-width", (d: any) => (d.weight || 1) * 2)
      .attr("opacity", (d: any) => {
        if (!hoveredNode) return 0.4;
        return d.source.id === hoveredNode || d.target.id === hoveredNode ? 1 : 0.1;
      });

    // Render nodes
    const node = g
      .append("g")
      .selectAll("circle")
      .data(filteredNodes)
      .enter()
      .append("circle")
      .attr("r", (d) => NODE_SIZES[d.type])
      .attr("fill", (d) => NODE_COLORS[d.type])
      .attr("stroke", (d) =>
        selectedNode?.id === d.id ? "#fff" : "rgba(255,255,255,0.2)"
      )
      .attr("stroke-width", (d) => (selectedNode?.id === d.id ? 3 : 1))
      .style("cursor", "pointer")
      .on("mouseenter", (_event, d: any) => {
        setHoveredNode(d.id);
        // Update link opacity
        link.attr("opacity", (l: any) => {
          return l.source.id === d.id || l.target.id === d.id ? 1 : 0.1;
        });
      })
      .on("mouseleave", () => {
        setHoveredNode(null);
        link.attr("opacity", 0.4);
      })
      .on("click", (_event, d: any) => {
        setSelectedNode(d);
        _event.stopPropagation();
      });

    // Add labels
    const labels = g
      .append("g")
      .selectAll("text")
      .data(filteredNodes)
      .enter()
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-1.5em")
      .attr("font-size", "11px")
      .attr("fill", "#e5e7eb")
      .attr("pointer-events", "none")
      .text((d) => d.label)
      .style("font-weight", (d) => (selectedNode?.id === d.id ? "bold" : "normal"));

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => (d.source as GraphNode).x || 0)
        .attr("y1", (d: any) => (d.source as GraphNode).y || 0)
        .attr("x2", (d: any) => (d.target as GraphNode).x || 0)
        .attr("y2", (d: any) => (d.target as GraphNode).y || 0);

      node
        .attr("cx", (d) => (d.x = Math.max(30, Math.min(width - 30, d.x || 0))))
        .attr("cy", (d) => (d.y = Math.max(30, Math.min(height - 30, d.y || 0))));

      labels
        .attr("x", (d) => d.x || 0)
        .attr("y", (d) => (d.y || 0) - NODE_SIZES[d.type] - 5);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [filterType, selectedNode, hoveredNode]);

  const nodeTypes: NodeType[] = [
    "Protocol",
    "Concept",
    "Strategy",
    "Risk",
    "Metric",
    "Phase",
    "Skill",
    "Token",
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      {/* Controls */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 space-y-3">
        <h2 className="text-lg font-bold text-white">DeFi Knowledge Graph</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              filterType === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            All
          </button>
          {nodeTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded text-sm transition-colors flex items-center gap-1.5 ${
                filterType === type
                  ? "text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              style={{
                backgroundColor: filterType === type ? NODE_COLORS[type] : "",
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: NODE_COLORS[type] }}
              />
              {type}
            </button>
          ))}
        </div>
        {selectedNode && (
          <div className="bg-gray-700 p-3 rounded border-l-4 border-blue-500">
            <h3 className="font-bold text-white mb-1">{selectedNode.label}</h3>
            <p className="text-xs text-gray-300 mb-2">{selectedNode.description}</p>
            <p className="text-xs text-gray-400">Type: {selectedNode.type}</p>
          </div>
        )}
      </div>

      {/* Graph */}
      <svg
        ref={svgRef}
        className="flex-1 w-full"
        style={{ background: "rgba(30, 30, 30, 0.5)" }}
      />

      {/* Legend */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="text-xs text-gray-400 mb-2">Legend:</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {nodeTypes.map((type) => (
            <div key={type} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: NODE_COLORS[type] }}
              />
              <span className="text-gray-300">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
