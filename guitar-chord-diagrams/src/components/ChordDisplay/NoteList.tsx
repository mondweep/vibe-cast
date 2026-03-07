import type { NoteName } from '../../types';

interface NoteListProps {
  notes: NoteName[];
  root: NoteName;
}

export default function NoteList({ notes, root }: NoteListProps) {
  return (
    <div className="flex gap-2 justify-center mt-2">
      {notes.map((note, i) => (
        <span
          key={i}
          className={`px-3 py-1 rounded-lg text-sm font-medium ${
            note === root
              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          {note}
        </span>
      ))}
    </div>
  );
}
