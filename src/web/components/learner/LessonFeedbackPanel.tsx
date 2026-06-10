import React, { useState } from 'react';
import { Heart, MessageCircle, Send, Loader } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lessonFeedbackApi, LessonComment } from '@/api/lessonFeedback';

interface LessonFeedbackPanelProps {
  lessonId: string;
  /** True when the viewer is authenticated (controls write affordances). */
  isAuthenticated?: boolean;
}

/**
 * LessonFeedbackPanel — per-lesson likes toggle + comments thread.
 *
 * Renders below lesson content. Like button is a heart that toggles; total
 * count is shown alongside. Comments are listed newest-first with a text
 * area for authenticated learners.
 */
export function LessonFeedbackPanel({ lessonId, isAuthenticated = false }: LessonFeedbackPanelProps) {
  const queryClient = useQueryClient();
  const [commentDraft, setCommentDraft] = useState('');

  const feedbackKey = ['lesson-feedback', lessonId];

  const { data, isLoading } = useQuery({
    queryKey: feedbackKey,
    queryFn: () => lessonFeedbackApi.getFeedback(lessonId),
    staleTime: 30_000,
  });

  const likeMutation = useMutation({
    mutationFn: () => lessonFeedbackApi.toggleReaction(lessonId),
    onSuccess: (result) => {
      queryClient.setQueryData(feedbackKey, (prev: any) =>
        prev
          ? { ...prev, myLike: result.liked, likeCount: result.likeCount }
          : prev,
      );
    },
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => lessonFeedbackApi.addComment(lessonId, body),
    onSuccess: (newComment) => {
      setCommentDraft('');
      queryClient.setQueryData(feedbackKey, (prev: any) =>
        prev
          ? { ...prev, comments: [newComment, ...prev.comments] }
          : prev,
      );
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader className="animate-spin text-primary-600" size={24} />
      </div>
    );
  }

  const likeCount = data?.likeCount ?? 0;
  const myLike = data?.myLike ?? false;
  const comments: LessonComment[] = data?.comments ?? [];

  const handleLike = () => {
    if (!isAuthenticated) return;
    likeMutation.mutate();
  };

  const handleSubmitComment = () => {
    if (!commentDraft.trim()) return;
    commentMutation.mutate(commentDraft.trim());
  };

  return (
    <div className="space-y-6 pt-6 border-t border-gray-200">
      {/* Like row */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleLike}
          disabled={!isAuthenticated || likeMutation.isPending}
          aria-label={myLike ? 'Unlike this lesson' : 'Like this lesson'}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition text-sm font-medium
            ${myLike
              ? 'bg-red-50 border-red-300 text-red-600'
              : 'bg-white border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500'}
            ${!isAuthenticated ? 'cursor-default opacity-60' : 'cursor-pointer'}
          `}
        >
          <Heart size={16} className={myLike ? 'fill-red-500 text-red-500' : ''} />
          <span>{likeCount}</span>
        </button>
        {!isAuthenticated && (
          <span className="text-xs text-gray-400">Sign in to like this lesson.</span>
        )}
      </div>

      {/* Comments */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <MessageCircle size={18} className="text-primary-600" />
          Comments {comments.length > 0 && <span className="text-gray-500 font-normal text-sm">({comments.length})</span>}
        </h3>

        {isAuthenticated && (
          <div className="flex gap-3">
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Share a thought or question…"
              rows={3}
              maxLength={2000}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <button
              onClick={handleSubmitComment}
              disabled={!commentDraft.trim() || commentMutation.isPending}
              className="self-end flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium disabled:opacity-50"
            >
              {commentMutation.isPending ? (
                <Loader size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Post
            </button>
          </div>
        )}

        {comments.length === 0 ? (
          <p className="text-sm text-gray-400">No comments yet. Be the first!</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
                <p className="text-gray-700">{c.body}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(c.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default LessonFeedbackPanel;
