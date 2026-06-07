import { FastifyRequest, FastifyReply } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../../shared/infrastructure/logging/Logger';
import { successResponse, errorResponse } from '../utils/response';

/**
 * Knowledge Graph read API (ADR-014). Exposes the Ruflo knowledge graph
 * (nodes + edges) so the frontend can visualise it. The kg tables are
 * public-read (RLS), so this is an unauthenticated GET. The whole graph is
 * small (~166 nodes / ~284 edges) so it ships in a single response.
 */
export class KnowledgeGraphController {
  constructor(private supabase: SupabaseClient, private logger: Logger) {}

  async getGraph(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    try {
      const [nodesRes, edgesRes, linksRes] = await Promise.all([
        this.supabase.from('ruflo_demo_kg_node').select('node_id,kind,name,summary,source_refs'),
        this.supabase.from('ruflo_demo_kg_edge').select('from_node,to_node,relation'),
        this.supabase.from('ruflo_demo_lesson_concept').select('lesson_id,node_id'),
      ]);
      if (nodesRes.error) throw nodesRes.error;
      if (edgesRes.error) throw edgesRes.error;
      if (linksRes.error) throw linksRes.error;

      const links = linksRes.data || [];
      const lessonIds = [...new Set(links.map((l: any) => l.lesson_id))];
      let lessons: any[] = [];
      if (lessonIds.length) {
        const { data } = await this.supabase
          .from('ruflo_demo_lesson_read_model')
          .select('lesson_id,title,lesson_order,path_id')
          .in('lesson_id', lessonIds);
        lessons = data || [];
      }
      const lessonById = new Map(lessons.map((l: any) => [l.lesson_id, l]));

      const lessonsByNode = new Map<string, any[]>();
      links.forEach((l: any) => {
        const les = lessonById.get(l.lesson_id);
        if (!les) return;
        const arr = lessonsByNode.get(l.node_id) || [];
        arr.push({ id: les.lesson_id, title: les.title, order: les.lesson_order, pathId: les.path_id });
        lessonsByNode.set(l.node_id, arr);
      });

      const nodes = (nodesRes.data || []).map((n: any) => ({
        id: n.node_id,
        kind: n.kind,
        name: n.name,
        summary: n.summary,
        sourceRefs: n.source_refs || [],
        lessons: lessonsByNode.get(n.node_id) || [],
      }));
      // react-force-graph expects link endpoints as `source`/`target`.
      const edges = (edgesRes.data || []).map((e: any) => ({
        source: e.from_node,
        target: e.to_node,
        relation: e.relation,
      }));

      reply.status(200).send(
        successResponse({ nodes, edges, counts: { nodes: nodes.length, edges: edges.length } }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Knowledge graph fetch failed', { error: message, correlationId });
      reply
        .status(500)
        .send(errorResponse('Failed to load knowledge graph', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }
}
