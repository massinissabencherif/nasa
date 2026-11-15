import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react';

/** Shared surface and focus treatment; native input semantics stay intact. */
export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`hz-control ${className}`} />;
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="hz-select">
      <select {...props} className={`hz-control ${className}`} />
    </span>
  );
}
