import React from 'react';
import { cn } from '@/lib/utils';
import { Severity } from '@/types';

export function Badge({ className, severity, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { severity?: Severity | 'default' }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2",
        {
          'border-transparent bg-zinc-800 text-zinc-100 hover:bg-zinc-800/80': severity === 'default' || !severity,
          'border-transparent bg-red-950 text-red-400': severity === 'Critical',
          'border-transparent bg-orange-950 text-orange-400': severity === 'High',
          'border-transparent bg-yellow-950 text-yellow-400': severity === 'Medium',
          'border-transparent bg-blue-950 text-blue-400': severity === 'Low',
          'border-transparent bg-zinc-800 text-zinc-400': severity === 'Info',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
