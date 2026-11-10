import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ReadoutNumber({
  value,
  decimals = 1,
  size = 'var(--text-display)',
  color = 'var(--text)',
  durationMs = 700,
}: {
  value: number;
  decimals?: number;
  size?: string;
  color?: string;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = prevValue.current;
    const to = value;
    prevValue.current = value;
    if (from === to) return;
    if (prefersReducedMotion()) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setDisplay(from + (to - from) * ease(t));
      if (t < 1) {
        frame.current = requestAnimationFrame(step);
      } else {
        setDisplay(to);
      }
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, durationMs]);

  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        fontSize: size,
        color,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
      }}
    >
      {display.toFixed(decimals)}
    </span>
  );
}
