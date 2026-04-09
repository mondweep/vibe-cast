import { useState } from 'react';
import type { SearchResult } from '../types';
import { useApiCall, getErrorMessage } from '../hooks/useApiCall';

interface MemoryCardProps {
  initialResult: SearchResult;
  onDeleted?: (id: string) => void;
}

export function MemoryCard({ initialResult, onDeleted }: MemoryCardProps) {
  const [result, setResult] = useState<SearchResult>(initialResult);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingExpand, setIsLoadingExpand] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorString, setErrorString] = useState<string | null>(null);
  const { call } = useApiCall();

  const handleExpand = async () => {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }

    // Attempt to fetch full memory
    setIsLoadingExpand(true);
    setErrorString(null);
    try {
      const fullMemory = await call<any>('/api/memory?id=' + result.id, null, { method: 'GET' });
      if (fullMemory && fullMemory.content) {
        setResult((prev) => ({ ...prev, content: fullMemory.content }));
        setIsExpanded(true);
      }
    } catch (e: any) {
      console.error('Failed to load full memory:', e);
      setErrorString('Failed to expand memory.');
    } finally {
      setIsLoadingExpand(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this memory?")) return;
    
    setIsDeleting(true);
    setErrorString(null);
    try {
      await call('/api/delete?id=' + result.id, null, { method: 'DELETE' });
      if (onDeleted) onDeleted(result.id);
    } catch (e: any) {
      console.error('Failed to delete memory:', e);
      if (e?.code === 'FORBIDDEN' || e?.status === 403) {
        alert("You do not have permission to delete this memory.");
      } else {
        setErrorString('Failed to delete: ' + getErrorMessage(e));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const hasMoreText = !isExpanded && (result.content?.length >= 595 || result.content?.endsWith('...'));

  return (
    <div className="result-card" style={isDeleting ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
      <div className="result-header">
        <h4>{result?.title || 'Untitled'}</h4>
        <div className="result-meta">
          <span className="relevance-score">
            📊 {Math.round((result?.score || 0) * 100)}%
          </span>
          {result?.domain && <span className="domain">📁 {String(result.domain)}</span>}
        </div>
      </div>

      <p className="result-content" style={{ whiteSpace: isExpanded ? 'pre-wrap' : 'normal' }}>
        {result?.content || ''}
      </p>

      {hasMoreText && !isExpanded && (
        <button onClick={handleExpand} style={{ background: 'none', border: 'none', color: '#61dafb', cursor: 'pointer', padding: 0, marginTop: '8px', fontSize: '0.9rem' }}>
          {isLoadingExpand ? 'Loading...' : 'Read Full Original Text'}
        </button>
      )}

      {isExpanded && (
        <button onClick={handleExpand} style={{ background: 'none', border: 'none', color: '#61dafb', cursor: 'pointer', padding: 0, marginTop: '8px', fontSize: '0.9rem' }}>
          Show Less
        </button>
      )}

      {errorString && <div style={{ color: '#ff6b6b', fontSize: '0.85rem', marginTop: '10px' }}>{errorString}</div>}

      <div className="result-footer" style={{ marginTop: '15px' }}>
        <div className="votes">
          <button className="vote-btn upvote" title="Upvote">
            👍 {result?.votes?.up || 0}
          </button>
          <button className="vote-btn downvote" title="Downvote">
            👎 {result?.votes?.down || 0}
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button onClick={handleDelete} className="vote-btn downvote" title="Delete Memory" style={{ color: '#ff6b6b' }}>
            🗑️ Remove
          </button>
          <span className="timestamp">
            {result.createdAt && !isNaN(new Date(result.createdAt).getTime()) 
              ? new Date(result.createdAt).toLocaleDateString() 
              : 'Recently updated'}
          </span>
        </div>
      </div>
    </div>
  );
}
