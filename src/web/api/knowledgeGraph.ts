import apiClient from './client';

export interface KGSourceRef {
  file: string;
  lines?: string;
  quote?: string;
}

export interface KGLessonLink {
  id: string;
  title: string;
  order: number;
  pathId: string;
}

export interface KGNode {
  id: string;
  kind: string;
  name: string;
  summary: string;
  sourceRefs: KGSourceRef[];
  lessons: KGLessonLink[];
}

export interface KGEdge {
  source: string;
  target: string;
  relation: string;
}

export interface KGGraph {
  nodes: KGNode[];
  edges: KGEdge[];
  counts: { nodes: number; edges: number };
}

export const kgApi = {
  async getGraph(): Promise<KGGraph> {
    const res = await apiClient.get('/kg/graph');
    return res.data.data;
  },
};

export default kgApi;
