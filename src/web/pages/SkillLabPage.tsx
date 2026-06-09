import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, ArrowRight, Loader, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { skillLabApi, type Exercise, type SkillCategory, type SkillLevel } from '@/api/skillLab';

const LEVEL_STYLES: Record<string, string> = {
  beginner:     'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced:     'bg-red-100 text-red-800',
};

const SKILL_STYLES: Record<string, string> = {
  'message-passing': 'bg-blue-100 text-blue-800',
  'leader-election': 'bg-purple-100 text-purple-800',
  consensus:         'bg-orange-100 text-orange-800',
  topology:          'bg-cyan-100 text-cyan-800',
  memory:            'bg-pink-100 text-pink-800',
};

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${SKILL_STYLES[exercise.skill] ?? 'bg-gray-100 text-gray-700'}`}>
          {exercise.skill.replace('-', ' ')}
        </span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${LEVEL_STYLES[exercise.level] ?? 'bg-gray-100 text-gray-700'}`}>
          {exercise.level}
        </span>
      </div>

      <h3 className="text-lg font-bold text-gray-900">{exercise.title}</h3>
      <p className="text-gray-600 text-sm mt-2 flex-1 line-clamp-3">{exercise.description}</p>

      <Link
        to={`/skill-lab/exercises/${exercise.exercise_id}`}
        className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
      >
        Start Exercise <ArrowRight size={16} />
      </Link>
    </div>
  );
}

const ALL = 'all';

export function SkillLabPage() {
  const [skillFilter, setSkillFilter] = useState<string>(ALL);
  const [levelFilter, setLevelFilter] = useState<string>(ALL);

  const { data: exercises = [], isLoading, isError } = useQuery({
    queryKey: ['skill-lab-exercises', skillFilter, levelFilter],
    queryFn: () =>
      skillLabApi.listExercises({
        skill: skillFilter !== ALL ? (skillFilter as SkillCategory) : undefined,
        level: levelFilter !== ALL ? (levelFilter as SkillLevel) : undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FlaskConical className="text-primary-600" /> Skill Lab
        </h1>
        <p className="text-gray-600 mt-2">
          Practice real Ruflo orchestration patterns
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value={ALL}>All skills</option>
            <option value="message-passing">Message passing</option>
            <option value="leader-election">Leader election</option>
            <option value="consensus">Consensus</option>
            <option value="topology">Topology</option>
            <option value="memory">Memory</option>
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value={ALL}>All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader className="animate-spin text-primary-600" size={32} />
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          Couldn't load exercises. Please try again.
        </div>
      )}

      {!isLoading && !isError && exercises.length === 0 && (
        <p className="text-gray-600 text-center py-12">
          No exercises match the selected filters.
        </p>
      )}

      {exercises.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exercises.map((ex) => (
            <ExerciseCard key={ex.exercise_id} exercise={ex} />
          ))}
        </div>
      )}
    </div>
  );
}

export default SkillLabPage;
