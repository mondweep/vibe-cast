"use client";

import { KnowledgeGraphViewer } from "@/components/graph/KnowledgeGraphViewer";

export default function GraphPage() {
  return (
    <div style={{ height: "calc(100vh - 50px)" }}>
      <KnowledgeGraphViewer />
    </div>
  );
}
