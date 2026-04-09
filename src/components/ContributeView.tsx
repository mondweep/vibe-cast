/**
 * ContributeView Component
 *
 * Enables users to submit new knowledge (memories) to the pi network.
 * - Knowledge submission form with validation
 * - Real-time confirmation via PubNub
 * - Loading and error states
 *
 * Reference: SPEC-001
 */

import { useState, useCallback, useEffect } from 'react';
import type { ContributionResponse } from '../types';
import { usePubNubSubscription } from '../hooks/usePubNubSubscription';
import { useApiCall, getErrorMessage } from '../hooks/useApiCall';
import './ContributeView.css';

interface ContributeViewProps {
  sessionId: string;
}

const DOMAINS = ['ai', 'science', 'technology', 'philosophy', 'general', 'other'];

export function ContributeView({ sessionId }: ContributeViewProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    domain: 'general',
    tags: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { call, error, loading } = useApiCall();

  // Subscribe to contribution updates from PubNub
  const contribution = usePubNubSubscription<ContributionResponse>(
    `contribution_updates_${sessionId}`,
  );

  // Show success message when confirmation received
  useEffect(() => {
    if (contribution?.status === 'accepted') {
      setSuccess(true);
      setFormData({ title: '', content: '', domain: 'general', tags: '' });
      const timeout = setTimeout(() => setSuccess(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [contribution]);

  const handleChange = useCallback((e: React.ChangeEvent<any>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const validateForm = (): string | null => {
    if (!formData.title.trim()) {
      return 'Title is required';
    }
    if (formData.title.length < 1 || formData.title.length > 200) {
      return 'Title must be between 1 and 200 characters';
    }
    if (!formData.content.trim()) {
      return 'Content is required';
    }
    if (formData.content.length < 10 || formData.content.length > 5000) {
      return 'Content must be between 10 and 5000 characters';
    }
    if (!formData.domain.trim()) {
      return 'Domain is required';
    }
    return null;
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const validationError = validateForm();
      if (validationError) {
        alert(validationError);
        return;
      }

      setIsSubmitting(true);

      try {
        const tags = formData.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);

        await call('/api/contribute', {
          title: formData.title.trim(),
          content: formData.content.trim(),
          domain: formData.domain,
          tags,
        });
        // Confirmation will arrive via PubNub subscription
      } catch (err) {
        console.error('Contribution failed:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, call],
  );

  const charCount = {
    title: formData.title.length,
    content: formData.content.length,
  };

  return (
    <div className="contribute-view">
      <section className="contribute-section">
        <h2>✍️ Contribute Knowledge</h2>
        <p>Share your insights and memories with the collective intelligence network</p>

        {success && (
          <div className="success-message">
            <strong>✅ Success!</strong> Your knowledge has been accepted into the network.
            {contribution?.memoryId && (
              <div className="memory-id">Memory ID: {contribution.memoryId}</div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="contribute-form">
          <div className="form-group">
            <label htmlFor="title">
              Title
              <span className="char-count">
                {charCount.title}/200
              </span>
            </label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Give your knowledge a clear title"
              disabled={isSubmitting}
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">
              Content
              <span className="char-count">
                {charCount.content}/5000
              </span>
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Describe your knowledge in detail (min 10 chars)"
              disabled={isSubmitting}
              maxLength={5000}
              rows={6}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="domain">Domain</label>
              <select
                id="domain"
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                {DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tags">Tags (comma-separated)</label>
              <input
                id="tags"
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="e.g., ai, learning, neural-networks"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isSubmitting || loading}>
              {isSubmitting || loading ? '📤 Submitting...' : '📤 Submit Knowledge'}
            </button>
          </div>

          {error && (
            <div className="error-message">
              <strong>Error:</strong> {getErrorMessage(error)}
            </div>
          )}
        </form>
      </section>

      <section className="contribute-info">
        <h3>Guidelines</h3>
        <ul>
          <li>
            <strong>Be clear:</strong> Use specific, well-structured knowledge
          </li>
          <li>
            <strong>Be accurate:</strong> Verify facts before submitting
          </li>
          <li>
            <strong>Be constructive:</strong> Contribute to collective understanding
          </li>
          <li>
            <strong>Be respectful:</strong> Acknowledge other contributors
          </li>
          <li>
            <strong>Use tags:</strong> Help others discover your knowledge
          </li>
        </ul>
      </section>
    </div>
  );
}
