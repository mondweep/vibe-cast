import { FastifyRequest, FastifyReply } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../../shared/infrastructure/logging/Logger';
import { embedText, toVectorLiteral } from '../../learning/infrastructure/embeddings';
import { successResponse, errorResponse } from '../utils/response';
import { resolveLLMConfig, chatComplete } from '../services/llmProvider';

const SCORE_FLOOR = 0.3; // below this, treat the question as not covered by the graph

/**
 * Tutor Controller — GraphRAG over the Ruflo knowledge graph (ADR-014).
 * Retrieval + citations are always grounded in the graph; LLM synthesis is
 * optional. The provider + key are resolved from the request (bring-your-own-key
 * from the browser) or from server env vars (see src/api/services/llmProvider).
 */
export class TutorController {
  constructor(private supabase: SupabaseClient, private logger: Logger) {}

  async ask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const correlationId = (request as any).correlationId;
    const body = (request.body as any) || {};
    const question = String(body.question || '').trim();
    if (!question) {
      return reply.status(400).send(errorResponse('question is required', 'BAD_REQUEST', undefined, correlationId));
    }

    try {
      const embedding = await embedText(question);
      const { data: hits, error } = await this.supabase.rpc('kg_search', {
        query_embedding: toVectorLiteral(embedding),
        match_count: 8,
      });
      if (error) throw error;

      const top = (hits || []).filter((h: any) => h.score >= SCORE_FLOOR);
      if (top.length === 0) {
        return reply.status(200).send(successResponse({
          mode: 'refused',
          answer:
            "I don't have that in the Ruflo knowledge base yet. Try rephrasing, or ask about agents, swarms, topologies, messaging, memory, hooks, consensus, or the Ruflo CLI / MCP tools.",
          citations: [],
          lessons: [],
          suggestedNext: [],
        }));
      }
      const topIds: string[] = top.map((h: any) => h.node_id);

      const { data: details } = await this.supabase
        .from('ruflo_demo_kg_node')
        .select('node_id,kind,name,summary,body,source_refs')
        .in('node_id', topIds);
      const detailById = new Map((details || []).map((d: any) => [d.node_id, d]));

      // 1-hop neighbours (both directions) for richer LLM context
      const { data: edges } = await this.supabase
        .from('ruflo_demo_kg_edge')
        .select('from_node,to_node,relation')
        .or(`from_node.in.(${topIds.join(',')}),to_node.in.(${topIds.join(',')})`);
      const neighbourIds = new Set<string>();
      (edges || []).forEach((e: any) => {
        if (topIds.includes(e.from_node)) neighbourIds.add(e.to_node);
        if (topIds.includes(e.to_node)) neighbourIds.add(e.from_node);
      });
      topIds.forEach((id) => neighbourIds.delete(id));
      const neighbourIdList = [...neighbourIds].slice(0, 12);
      let neighbours: any[] = [];
      if (neighbourIdList.length) {
        const { data: nd } = await this.supabase
          .from('ruflo_demo_kg_node')
          .select('node_id,kind,name,summary')
          .in('node_id', neighbourIdList);
        neighbours = nd || [];
      }

      // lessons that teach the top nodes
      const { data: links } = await this.supabase
        .from('ruflo_demo_lesson_concept')
        .select('lesson_id,node_id')
        .in('node_id', topIds);
      const lessonIds = [...new Set((links || []).map((l: any) => l.lesson_id))];
      let lessons: any[] = [];
      if (lessonIds.length) {
        const { data: ls } = await this.supabase
          .from('ruflo_demo_lesson_read_model')
          .select('lesson_id,title,lesson_order,path_id')
          .in('lesson_id', lessonIds);
        lessons = (ls || []).map((l: any) => ({ id: l.lesson_id, title: l.title, order: l.lesson_order, pathId: l.path_id }));
      }

      const citations = top.map((h: any) => {
        const d: any = detailById.get(h.node_id) || {};
        return {
          name: h.name,
          kind: h.kind,
          summary: h.summary,
          score: Number(Number(h.score).toFixed(3)),
          sourceRefs: d.source_refs || [],
        };
      });

      let answer: string | null = null;
      let mode = 'retrieval';
      let provider: string | undefined;
      const llmConfig = resolveLLMConfig(body.llm);
      if (llmConfig) {
        try {
          answer = await this.synthesize(
            llmConfig,
            question,
            topIds.map((id) => detailById.get(id)).filter(Boolean),
            neighbours,
            lessons,
          );
          mode = 'synthesized';
          provider = llmConfig.provider;
        } catch (e) {
          // Never log the key; only the provider + error message.
          this.logger.warn('Tutor synthesis failed; returning retrieval only', {
            provider: llmConfig.provider,
            model: llmConfig.model,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
      if (!answer) answer = this.retrievalAnswer(citations, lessons);

      reply.status(200).send(
        successResponse({ mode, provider, answer, citations, lessons, suggestedNext: lessons.slice(0, 3) }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Tutor ask failed', { error: message, correlationId });
      reply.status(500).send(errorResponse('Tutor failed', 'INTERNAL_ERROR', undefined, correlationId));
    }
  }

  private retrievalAnswer(citations: any[], lessons: any[]): string {
    const lines = citations
      .slice(0, 5)
      .map((c) => `• **${c.name}** (${String(c.kind).replace('_', ' ')}): ${c.summary}`);
    let txt = `Here's what the Ruflo knowledge base has on that:\n\n${lines.join('\n')}`;
    if (lessons.length) txt += `\n\nRelated lessons: ${lessons.map((l) => l.title).join(', ')}.`;
    return txt;
  }

  private async synthesize(
    llmConfig: import('../services/llmProvider').LLMConfig,
    question: string,
    topNodes: any[],
    neighbours: any[],
    lessons: any[],
  ): Promise<string> {
    const ctx = topNodes
      .map(
        (n) =>
          `### ${n.name} [${n.kind}]\n${n.summary}\n${n.body || ''}\nSources: ${(n.source_refs || [])
            .map((s: any) => s.file + (s.lines ? ':' + s.lines : ''))
            .join('; ')}`,
      )
      .join('\n\n');
    const neigh = neighbours.map((n) => `- ${n.name} (${n.kind}): ${n.summary}`).join('\n');
    const lessonList = lessons.map((l) => `- Lesson ${l.order}: ${l.title}`).join('\n');
    const system =
      'You are the Ruflo learning tutor. Answer ONLY using the provided knowledge context about the Ruflo agent-orchestration platform. Cite node names in **bold**. If the context does not contain the answer, say you do not have that information yet — never invent commands, tools, or APIs. Be concise and practical for a backend engineer.';
    const prompt = `Question: ${question}\n\n## Knowledge context\n${ctx}\n\n## Related nodes\n${neigh}\n\n## Related lessons\n${lessonList}`;
    return chatComplete(llmConfig, { system, prompt, maxTokens: 700 });
  }
}
