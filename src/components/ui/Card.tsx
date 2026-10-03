import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export function Card({ title, description, action, className = '', children, ...props }: CardProps) {
  return (
    <div className={`rounded-2xl border border-neutral-800 bg-neutral-950 p-5 ${className}`} {...props}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">{title}</h2>}
            {description && <p className="mt-1 text-xs text-neutral-500">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
