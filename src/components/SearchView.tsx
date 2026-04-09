/**
 * SearchView Component
 *
 * Enables users to search the pi network knowledge graph.
 * - Search form with query input
 * - Real-time results via PubNub
 * - Loading and error states
 *
 * Reference: SPEC-001
 */

import { useState, useCallback, useMemo } from 'react';
import type { SearchResult } from '../types';
import { usePubNubSubscription } from '../hooks/usePubNubSubscription';
import { useApiCall, getErrorMessage } from '../hooks/useApiCall';
import './SearchView.css';

interface SearchViewProps {
  sessionId: string;
}

export function SearchView({ sessionId }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { call, error, loading } = useApiCall();

  // Subscribe to search results from PubNub
  const searchResponse = usePubNubSubscription<any>(`search_results_${sessionId}`);
  const results: SearchResult[] = useMemo(
    () => (searchResponse && 'results' in searchResponse ? searchResponse.results : []),
    [searchResponse],
  );

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!query.trim()) {
        alert('Please enter a search query');
        return;
      }

      setIsSearching(true);

      try {
        await call('/api/search', {
          query: query.trim(),
          limit: 20,
          offset: 0,
          domain: domain || undefined,
        });
        // Results will arrive via PubNub subscription
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [query, domain, call],
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setDomain('');
  }, []);

  return (
    <div className="search-view">
      <section className="search-section">
        <h2>🔍 Search Knowledge Graph</h2>
        <p>Query the pi network for knowledge matching your interests</p>

        <form onSubmit={handleSearch} className="search-form">
          <div className="form-group">
            <label htmlFor="query">Search Query</label>
            <input
              id="query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., 'machine learning', 'quantum computing'"
              disabled={isSearching}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="domain">Domain (optional)</label>
            <input
              id="domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g., 'ai', 'technology', 'science'"
              disabled={isSearching}
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isSearching || loading}>
              {isSearching || loading ? '🔄 Searching...' : '🔍 Search'}
            </button>
            <button type="button" onClick={handleClear} disabled={isSearching}>
              Clear
            </button>
          </div>

          {error && (
            <div className="error-message">
              <strong>Error:</strong> {getErrorMessage(error)}
            </div>
          )}
        </form>
      </section>

      <section className="results-section">
        <h3>
          Results ({results.length})
          {isSearching && <span className="loading-spinner">⚙️</span>}
        </h3>

        {results.length === 0 ? (
          <div className="empty-state">
            <p>
              {query ? 'No results found for your query.' : 'Search the knowledge graph to see results.'}
            </p>
          </div>
        ) : (
          <div className="results-grid">
            {results.map((result) => (
              <div key={result.id} className="result-card">
                <div className="result-header">
                  <h4>{result.title}</h4>
                  <div className="result-meta">
                    <span className="relevance-score">
                      📊 {Math.round(result.score * 100)}%
                    </span>
                    {result.domain && <span className="domain">📁 {result.domain}</span>}
                  </div>
                </div>

                <p className="result-content">{result.content}</p>

                <div className="result-footer">
                  <div className="votes">
                    <button className="vote-btn upvote" title="Upvote">
                      👍 {result.votes.up}
                    </button>
                    <button className="vote-btn downvote" title="Downvote">
                      👎 {result.votes.down}
                    </button>
                  </div>
                  <span className="timestamp">
                    {new Date(result.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
