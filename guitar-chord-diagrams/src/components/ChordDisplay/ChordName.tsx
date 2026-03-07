interface ChordNameProps {
  name: string;
  root: string;
}

export default function ChordName({ name, root }: ChordNameProps) {
  const suffix = name.substring(root.length);

  return (
    <div className="text-center">
      <h2 className="text-5xl font-bold tracking-tight">
        <span className="text-indigo-600">{root}</span>
        <span className="text-gray-800">{suffix}</span>
      </h2>
    </div>
  );
}
