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
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {note}
        </span>
      ))}
    </div>
  );
}
