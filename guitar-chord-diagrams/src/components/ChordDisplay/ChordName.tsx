interface ChordNameProps {
  name: string;
  root: string;
}

export default function ChordName({ name, root }: ChordNameProps) {
  const suffix = name.substring(root.length);

  return (
    <div className="text-center">
      <h2 className="text-5xl font-bold tracking-tight">
        <span className="text-indigo-600 dark:text-indigo-400">{root}</span>
        <span className="text-gray-800 dark:text-gray-200">{suffix}</span>
      </h2>
    </div>
  );
}
