import React from 'react';
import { Lock } from 'lucide-react';

interface PremiumBadgeProps {
  size?: 'sm' | 'md';
}

export function PremiumBadge({ size = 'sm' }: PremiumBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-yellow-300 bg-yellow-100 text-yellow-800 font-medium ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      <Lock className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      Premium
    </span>
  );
}

export default PremiumBadge;
