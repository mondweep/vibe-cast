"use client";

const audiencePresets = [
  "General audience",
  "Technical practitioners",
  "C-suite executives",
  "Academic peers",
  "Students / beginners",
];

const tonePresets = [
  { value: "general-audience", label: "Accessible" },
  { value: "authoritative", label: "Authoritative" },
  { value: "conversational", label: "Conversational" },
  { value: "executive", label: "Executive" },
  { value: "instructional", label: "Instructional" },
];

interface ToneOptionsProps {
  audience: string;
  tone: string;
  onAudienceChange: (audience: string) => void;
  onToneChange: (tone: string) => void;
}

export function ToneOptions({
  audience,
  tone,
  onAudienceChange,
  onToneChange,
}: ToneOptionsProps) {
  return (
    <div className="flex gap-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
      <div className="flex-1">
        <label className="block text-xs font-medium text-stone-500 mb-1">
          Target Audience
        </label>
        <select
          value={audience}
          onChange={(e) => onAudienceChange(e.target.value)}
          className="w-full px-2 py-1.5 rounded border border-stone-300 text-sm bg-white"
        >
          {audiencePresets.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-xs font-medium text-stone-500 mb-1">
          Target Tone
        </label>
        <select
          value={tone}
          onChange={(e) => onToneChange(e.target.value)}
          className="w-full px-2 py-1.5 rounded border border-stone-300 text-sm bg-white"
        >
          {tonePresets.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
