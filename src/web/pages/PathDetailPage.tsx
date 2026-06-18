import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Layers, Loader, PlayCircle, CheckCircle } from 'lucide-react';
import { useLearningPath, usePathLessons } from '@/hooks/usePaths';
import { useEnrollInPath, usePathEnrollments } from '@/hooks/useProgress';
import { useAuth } from '@/auth/AuthContext';
import type { Lesson } from '@/types';

function humanizeCapstone(value: string): string {
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function LessonRow({ lesson }: { lesson: Lesson }) {
  const hasContent = Array.isArray(lesson.content) && lesson.content.length > 0;
  return (
    <Link
      to={`/lessons/${lesson.id}`}
      className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-200 transition"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-semibold flex items-center justify-center">
        {lesson.order}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
          <span className="flex items-center gap-1 text-sm text-gray-500 flex-shrink-0">
            <Clock size={14} /> {lesson.estimatedHours}h
          </span>
        </div>
        {lesson.topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {lesson.topics.map((topic) => (
              <span
                key={topic}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 mt-3 text-xs">
          <span className="text-gray-500">
            Capstone: <span className="font-medium text-gray-700">{humanizeCapstone(lesson.capstone)}</span>
          </span>
          <span className={hasContent ? 'text-green-600' : 'text-gray-400'}>
            {hasContent ? 'Content available' : 'Content coming soon'}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function PathDetailPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const { user } = useAuth();
  const { data: path, isLoading: pathLoading } = useLearningPath(pathId);
  const { data: lessons = [], isLoading: lessonsLoading } = usePathLessons(pathId);
  const { data: enrollments = [] } = usePathEnrollments(user?.id);
  const { mutate: enroll, isPending: enrolling } = useEnrollInPath();

  const isEnrolled = enrollments.some((e) => e.pathId === pathId);

  const handleEnroll = () => {
    if (!user?.id || !pathId) return;
    enroll({ pathId, learnerId: user.id });
  };

  if (pathLoading || lessonsLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  if (!path) {
    return (
      <div className="space-y-4">
        <Link to="/paths" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm">
          <ArrowLeft size={16} /> Back to Learning Paths
        </Link>
        <p className="text-gray-600">Learning path not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/paths" className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm">
        <ArrowLeft size={16} /> Back to Learning Paths
      </Link>

      <div className="bg-white rounded-lg shadow p-6">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-100 text-primary-700 capitalize">
          {path.level}
        </span>
        <h1 className="text-2xl font-bold text-gray-900 mt-3">{path.title}</h1>
        <p className="text-gray-600 mt-2">{path.description}</p>
        <div className="flex items-center gap-4 text-sm text-gray-600 mt-4">
          <span className="flex items-center gap-1">
            <Layers size={16} /> {path.lessonCount} lessons
          </span>
          <span className="flex items-center gap-1">
            <Clock size={16} /> {path.estimatedHours} hours
          </span>
        </div>
        {user && (
          <div className="mt-5">
            {isEnrolled ? (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-success-100 text-success-700 rounded-lg text-sm font-medium">
                <CheckCircle size={16} /> Enrolled — track progress on Dashboard
              </span>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold disabled:opacity-60"
              >
                {enrolling ? <Loader className="animate-spin" size={16} /> : <PlayCircle size={16} />}
                {enrolling ? 'Starting...' : 'Start Learning'}
              </button>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Lessons</h2>
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default PathDetailPage;
