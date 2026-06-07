import React from 'react';

interface ProgressBarProps {
  percentage: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  variant?: 'linear' | 'circular';
}

export function ProgressBar({
  percentage,
  label,
  size = 'md',
  showPercentage = true,
  variant = 'linear',
}: ProgressBarProps) {
  const normalizedPercentage = Math.min(Math.max(percentage, 0), 100);

  // Determine color based on percentage
  let colorClass = 'bg-error-500';
  if (normalizedPercentage >= 80) colorClass = 'bg-success-500';
  else if (normalizedPercentage >= 60) colorClass = 'bg-warning-500';

  const sizeClasses = {
    sm: { height: 'h-2', text: 'text-xs' },
    md: { height: 'h-3', text: 'text-sm' },
    lg: { height: 'h-4', text: 'text-base' },
  };

  if (variant === 'circular') {
    const radius = size === 'sm' ? 40 : size === 'md' ? 60 : 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (normalizedPercentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <div className="relative inline-flex items-center justify-center">
          <svg width={radius * 2} height={radius * 2}>
            <circle
              cx={radius}
              cy={radius}
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="4"
            />
            <circle
              cx={radius}
              cy={radius}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={colorClass}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute text-center">
            <p className={`font-bold ${sizeClasses[size].text}`}>
              {normalizedPercentage}%
            </p>
            {label && (
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        {label && (
          <label className={`font-medium text-gray-700 ${sizeClasses[size].text}`}>
            {label}
          </label>
        )}
        {showPercentage && (
          <span className={`font-semibold text-gray-900 ${sizeClasses[size].text}`}>
            {normalizedPercentage}%
          </span>
        )}
      </div>
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size].height}`}>
        <div
          className={`${colorClass} ${sizeClasses[size].height} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${normalizedPercentage}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
