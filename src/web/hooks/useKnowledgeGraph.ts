import { useQuery } from '@tanstack/react-query';
import { kgApi } from '@/api/knowledgeGraph';

export function useKnowledgeGraph() {
  return useQuery({
    queryKey: ['kg', 'graph'],
    queryFn: () => kgApi.getGraph(),
    staleTime: 10 * 60 * 1000, // the graph changes rarely
  });
}
