import { printDiagrams, generateShareUrl, exportGridAsPng } from '../../utils/exportDiagrams';
import { useState, useRef, useCallback } from 'react';

interface ExportBarProps {
  chordName: string;
  gridRef: React.RefObject<HTMLDivElement | null>;
}

export default function ExportBar({ chordName, gridRef }: ExportBarProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number>(0);

  const handleExportPng = useCallback(() => {
    if (gridRef.current) {
      exportGridAsPng(gridRef.current, chordName.replace(/[^a-zA-Z0-9]/g, '_'));
    }
  }, [chordName, gridRef]);

  const handleShare = useCallback(() => {
    const url = generateShareUrl(chordName);
    navigator.clipboard.writeText(url);
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 2000);
  }, [chordName]);

  return (
    <div className="flex gap-2 mb-4 print:hidden">
      <button
        onClick={handleExportPng}
        className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7,10 12,15 17,10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export PNG
      </button>
      <button
        onClick={printDiagrams}
        className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="6,9 6,2 18,2 18,9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        Print
      </button>
      <button
        onClick={handleShare}
        className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        {copied ? 'Link Copied!' : 'Share'}
      </button>
    </div>
  );
}
