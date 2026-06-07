import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  CheckCircle,
  Info,
  Lightbulb,
  AlertTriangle,
  Target,
  Loader,
} from 'lucide-react';
import { useLesson } from '@/hooks/usePaths';
import { CompleteLessonButton } from '@/components/learner/CompleteLessonButton';

interface ContentBlock {
  type: string;
  items?: string[];
  text?: string;
  markdown?: string;
  language?: string;
  code?: string;
  caption?: string;
  variant?: string;
  title?: string;
  instructions?: string;
  question?: string;
  options?: string[];
  answerIndex?: number;
}

const CALLOUT_STYLES: Record<string, { box: string; icon: React.ReactNode }> = {
  note: { box: 'bg-blue-50 border-blue-200 text-blue-900', icon: <Info size={18} className="text-blue-600" /> },
  tip: { box: 'bg-green-50 border-green-200 text-green-900', icon: <Lightbulb size={18} className="text-green-600" /> },
  warning: { box: 'bg-yellow-50 border-yellow-200 text-yellow-900', icon: <AlertTriangle size={18} className="text-yellow-600" /> },
};

function QuizBlock({ block }: { block: ContentBlock }) {
  const [selected, setSelected] = useState<number | null>(null);
  const options = block.options ?? [];
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <p className="font-semibold text-gray-900 mb-3">{block.question}</p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const isAnswer = i === block.answerIndex;
          const chosen = selected === i;
          const show = selected !== null;
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              disabled={show}
              className={`w-full text-left px-4 py-2 rounded-lg border text-sm transition ${
                show && isAnswer
                  ? 'bg-green-50 border-green-300 text-green-800'
                  : show && chosen
                    ? 'bg-red-50 border-red-300 text-red-800'
                    : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <p className="text-sm mt-3 text-gray-600">
          {selected === block.answerIndex ? '✓ Correct.' : 'Not quite — the highlighted option is correct.'}
        </p>
      )}
    </div>
  );
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'objectives':
      return (
        <div className="bg-primary-50 border border-primary-100 rounded-lg p-5">
          <h3 className="flex items-center gap-2 font-semibold text-primary-800 mb-3">
            <Target size={18} /> Learning objectives
          </h3>
          <ul className="space-y-2">
            {(block.items ?? []).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle size={16} className="text-primary-600 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case 'heading':
      return <h2 className="text-xl font-bold text-gray-900 mt-2">{block.text}</h2>;
    case 'prose':
      return (
        <div className="prose prose-sm max-w-none text-gray-700">
          <ReactMarkdown>{block.markdown ?? ''}</ReactMarkdown>
        </div>
      );
    case 'code':
      return (
        <div>
          {block.caption && <p className="text-xs text-gray-500 mb-1">{block.caption}</p>}
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
            <code>{block.code}</code>
          </pre>
        </div>
      );
    case 'callout': {
      const style = CALLOUT_STYLES[block.variant ?? 'note'] ?? CALLOUT_STYLES.note;
      return (
        <div className={`border rounded-lg p-4 flex items-start gap-3 ${style.box}`}>
          <span className="flex-shrink-0 mt-0.5">{style.icon}</span>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{block.markdown ?? ''}</ReactMarkdown>
          </div>
        </div>
      );
    }
    case 'capstone':
      return (
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg p-6">
          <h3 className="font-bold text-lg mb-2">🎯 {block.title ?? 'Capstone'}</h3>
          <div className="prose prose-sm prose-invert max-w-none text-primary-50">
            <ReactMarkdown>{block.instructions ?? ''}</ReactMarkdown>
          </div>
        </div>
      );
    case 'quiz':
      return <QuizBlock block={block} />;
    default:
      return null;
  }
}

export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading } = useLesson(lessonId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="space-y-4">
        <Link to="/paths" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm">
          <ArrowLeft size={16} /> Back to Learning Paths
        </Link>
        <p className="text-gray-600">Lesson not found.</p>
      </div>
    );
  }

  const blocks = (lesson.content ?? []) as ContentBlock[];

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        to={`/paths/${lesson.pathId}`}
        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm"
      >
        <ArrowLeft size={16} /> Back to path
      </Link>

      <div>
        <p className="text-sm text-gray-500">Lesson {lesson.order}</p>
        <h1 className="text-3xl font-bold text-gray-900 mt-1">{lesson.title}</h1>
      </div>

      {blocks.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
          Content for this lesson is coming soon.
        </div>
      ) : (
        <div className="space-y-5">
          {blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-gray-200">
        <CompleteLessonButton lessonId={lesson.id} />
      </div>
    </div>
  );
}

export default LessonPage;
