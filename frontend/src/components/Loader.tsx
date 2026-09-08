import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoaderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export function Loader({ size = 'sm', className = '' }: LoaderProps) {
  return (
    <div role="status" className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}>
      <Loader2 className={`${sizeMap[size]} text-purple-400 animate-spin`} />
      <span className="sr-only">Loading...</span>
    </div>
  );
}