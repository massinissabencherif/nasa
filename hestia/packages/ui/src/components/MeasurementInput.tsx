import type { InputHTMLAttributes } from 'react';

/** Retains numeric keyboard/arrow-key semantics; the instrument frame and
 * unit are shared. A missing reading remains blank, never zero. */
export function MeasurementInput({
  unit,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { unit: string }) {
  return (
    <div className={`hz-measure-input ${className}`}>
      <input {...props} type="number" inputMode="decimal" className="hz-input" />
      <span aria-hidden="true" className="hz-measure-unit">
        {unit}
      </span>
    </div>
  );
}
