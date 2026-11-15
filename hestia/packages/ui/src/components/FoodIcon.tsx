import type { ReactNode } from 'react';

// Explicit catalogue names, not guesses from AI output. Unknown foods use a package.
const FOODS: Record<string, { shape: 'can' | 'box' | 'pouch' | 'jar'; mark: ReactNode }> = {
  'Tomato soup can': {
    shape: 'can',
    mark: (
      <>
        <circle cx="10" cy="11" r="3" />
        <path d="m8 7 2 1 2-1M10 8V6" />
      </>
    ),
  },
  'Oatmeal box': {
    shape: 'box',
    mark: (
      <>
        <path d="M10 15V7m0 3L7 8m3 5-3-2m3-1 3-2m-3 5 3-2" />
      </>
    ),
  },
  'Tuna can': {
    shape: 'can',
    mark: (
      <>
        <path d="M6 11c2-4 5-4 7 0-2 4-5 4-7 0Zm7 0 2-2v4z" />
        <circle cx="8" cy="10.5" r=".5" />
      </>
    ),
  },
  'Crackers pack': {
    shape: 'pouch',
    mark: (
      <>
        <rect x="7" y="8" width="6" height="6" rx="1" />
        <path d="M9 10h.1m2 2h.1" />
      </>
    ),
  },
  'Peanut butter jar': {
    shape: 'jar',
    mark: (
      <>
        <path d="M8 8c-3 2 0 3-1 5 0 3 4 3 5 1 0-2 3-4 0-6-1-1-2 1-4 0zM9 10l2 3" />
      </>
    ),
  },
  'Rice bag': {
    shape: 'pouch',
    mark: (
      <>
        <path d="M6 12c0 4 8 4 8 0zM8 8l1 2m2-3 1 2m1 1 1 1" />
      </>
    ),
  },
  'Cereal box': {
    shape: 'box',
    mark: (
      <>
        <path d="M6 12c0 4 8 4 8 0z" />
        <circle cx="8" cy="9" r="1" />
        <circle cx="12" cy="9" r="1" />
      </>
    ),
  },
  'Bean can': {
    shape: 'can',
    mark: (
      <>
        <path d="M8 8c-4 3-1 8 3 6 4-2 2-5 0-4-2 1 0-3-3-2z" />
      </>
    ),
  },
  'Water pouch': {
    shape: 'pouch',
    mark: (
      <>
        <path d="M10 6c-1 2-3 4-3 6a3 3 0 0 0 6 0c0-2-2-4-3-6z" />
      </>
    ),
  },
  'Energy bar box': {
    shape: 'box',
    mark: (
      <>
        <path d="m11 6-4 6h3l-1 4 4-6h-3z" />
      </>
    ),
  },
};

export function FoodIcon({ name }: { name: string }) {
  const food = FOODS[name];
  return (
    <svg
      className="hz-food-icon"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <g opacity=".65">
        {food?.shape === 'can' ? (
          <>
            <rect x="3.5" y="2" width="13" height="16" rx="2" />
            <path d="M4 5h12M4 16h12" />
          </>
        ) : food?.shape === 'pouch' ? (
          <>
            <path d="M5 2h10l-1 3 3 11-2 2H5l-2-2L6 5z" />
            <path d="M6 5h8" />
          </>
        ) : food?.shape === 'jar' ? (
          <>
            <path d="M6 4h8v2l2 2v8l-2 2H6l-2-2V8l2-2z" />
            <rect x="5" y="2" width="10" height="3" rx="1" />
          </>
        ) : (
          <>
            <rect x="3" y="2" width="14" height="16" rx="1" />
            <path d="M3 5h14" />
          </>
        )}
      </g>
      {food?.mark ?? <path d="M7 10h6M7 13h4" />}
    </svg>
  );
}
