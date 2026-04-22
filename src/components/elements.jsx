import React from 'react';
import Assessment from './Assessment.jsx';

export { Assessment };

export function Card({ children, className = '' }) {
  return (
    <div className={`border border-gray-300 rounded-lg p-4 bg-gray-50 ${className}`}>
      {children}
    </div>
  );
}

export function Alert({ children, type = 'info', className = '' }) {
  const bgColors = {
    info: 'bg-blue-50 border-blue-300',
    warning: 'bg-yellow-50 border-yellow-300',
    error: 'bg-red-50 border-red-300',
    success: 'bg-green-50 border-green-300',
  };

  return (
    <div className={`border-l-4 p-4 rounded ${bgColors[type] || bgColors.info} ${className}`}>
      {children}
    </div>
  );
}

export function CodeBlock({ code, language = 'javascript', className = '' }) {
  return (
    <pre className={`bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto ${className}`}>
      <code className={`language-${language}`}>{code}</code>
    </pre>
  );
}
