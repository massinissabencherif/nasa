import type { ZoneKey } from '../zones';

const POSITION: Record<ZoneKey, [number, number, number]> = {
  brain_morale: [82, 10, 36],
  eyes_sans: [83, 39, 34],
  heart: [97, 100, 29],
  bones: [97, 231, 37],
  muscles: [72, 301, 35],
  immunity: [88, 58, 28],
  skin: [128, 136, 32],
  digestive_nutrition: [87, 145, 40],
};

/** Illustrative anatomy/location cue, not a scan or a physiological reading.
 * Immunity and radiation are systems/exposures, represented by symbols. */
export function ZoneIllustration({ zone }: { zone: ZoneKey }) {
  if (zone === 'eyes_sans') {
    return (
      <g
        className="hz-organ hz-organ-eyes_sans"
        aria-hidden="true"
        pointerEvents="none"
        stroke="var(--anatomy-outline)"
        strokeWidth="0.8"
      >
        {[90, 110].map((x) => (
          <g key={x} transform={`translate(${x},49)`}>
            <path d="M-7 0C-4-5 4-5 7 0 4 5-4 5-7 0z" fill="var(--anatomy-eye)" />
            <circle r="2.8" fill="var(--anatomy-iris)" />
            <circle r="1.25" fill="var(--anatomy-outline)" stroke="none" />
            <circle cx="-0.8" cy="-0.8" r="0.55" fill="var(--anatomy-eye)" stroke="none" />
          </g>
        ))}
      </g>
    );
  }
  if (zone === 'muscles') {
    return (
      <g
        className="hz-organ hz-organ-muscles"
        aria-hidden="true"
        pointerEvents="none"
        fill="var(--anatomy-muscle)"
        stroke="var(--anatomy-outline)"
        strokeWidth="0.8"
        strokeLinecap="round"
      >
        {[false, true].map((mirrored) => (
          <g key={String(mirrored)} transform={mirrored ? 'translate(200 0) scale(-1 1)' : undefined}>
            <path d="M60 99c-7 4-8 19-7 30l2 14c5-8 8-28 8-38z" />
            <path d="m55 153-5 37c-1 12-2 21 0 30 4-13 8-34 8-48z" />
            <path d="M76 236c-2 18-1 52 5 72l4 13c7-26 10-58 7-84z" />
            <path
              d="M59 107c-3 10-4 20-4 28m-1 34-3 35m28 39c-2 23 0 43 5 61m5-61c1 17-1 40-4 56"
              fill="none"
              stroke="var(--anatomy-muscle-light)"
              strokeWidth="1.3"
            />
          </g>
        ))}
      </g>
    );
  }
  const [x, y, size] = POSITION[zone];
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      pointerEvents="none"
      overflow="visible"
    >
      <g
        key={zone}
        className={`hz-organ hz-organ-${zone}`}
        fill="var(--panel-raised)"
        stroke="var(--accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {zone === 'heart' && (
          <g fill="var(--anatomy-heart)" stroke="var(--anatomy-heart-outline)" strokeWidth="0.8">
            <path d="M16 15V9c0-6 4-8 9-7l4 2-2 5-4-2c-2 0-2 2-2 4v6z" fill="var(--anatomy-heart-shadow)" />
            <path d="m12 16-5-9 4-2 5 9m7 1 6-8 4 3-5 8" />
            <path d="M16 12C10 8 5 12 5 19c0 9 8 15 18 18 5-4 11-12 11-19 0-7-8-10-13-4-1-2-3-3-5-2z" />
            <path
              d="M22 15c7-7 12-2 12 4-1 7-5 13-11 18-2-8-1-14-1-22z"
              fill="var(--anatomy-heart-shadow)"
              stroke="none"
            />
            <path
              d="M9 17c-1 5 2 10 6 12"
              stroke="var(--anatomy-heart-light)"
              strokeWidth="2.4"
              fill="none"
            />
            <path
              d="M22 16c-3 5-4 13 1 20m-3-13-8-3m8 7 8-5"
              stroke="var(--anatomy-heart-light)"
              fill="none"
            />
          </g>
        )}
        {zone === 'brain_morale' && (
          <g fill="var(--anatomy-brain)" stroke="var(--anatomy-brain-fold)" strokeWidth="1.1">
            <path d="M20 7c-3-5-8-4-10 0-5-1-8 4-6 8-4 3-2 9 1 10-1 6 5 9 9 7 2 3 5 2 6 0 2 3 5 3 7 0 5 2 10-2 9-7 4-3 4-8 1-11 1-5-3-8-7-7-3-4-8-5-10 0z" />
            <path
              d="M20 7c-2 4 1 8 0 12-1 5 1 9 0 13M10 7c-1 4 3 5 5 4m-10 5c3-3 7-1 7 3m-7 7c2-4 6-4 8-1m1-10c4 3 2 7-1 7m-3 9c-1-3 1-6 4-6m16-18c1 4-3 5-5 4m11 5c-3-3-7-1-7 3m7 7c-2-4-6-4-8-1m-1-10c-4 3-2 7 1 7m2 9c1-3-1-6-4-6"
              fill="none"
            />
          </g>
        )}
        {zone === 'bones' && (
          <>
            <path d="M13 12c-7 2-11-6-6-9 4-2 7 1 8 4 4-2 8 3 5 7l9 14c6-1 9 5 5 8-3 3-7 0-8-3-5 2-8-3-5-7z" />
            <path d="m16 16 9 13" fill="none" />
          </>
        )}
        {zone === 'digestive_nutrition' && (
          <>
            <path d="M18 3v12c5 1 6-8 12-7 8 2 7 16 1 23-6 7-18 6-21-1-3-6-7-6-7-6l2-6c7-1 11 6 14 3-5-3-7-8-6-18" />
            <path d="M25 15c6 5 1 14-6 13" fill="none" />
          </>
        )}
        {zone === 'immunity' && (
          <>
            <path d="m20 4 14 5v11c0 8-6 13-14 17C12 33 6 28 6 20V9z" />
            <path d="m13 20 5 5 10-11" fill="none" />
          </>
        )}
        {zone === 'skin' && (
          <>
            <circle cx="20" cy="20" r="4" />
            <path d="M10 6a17 17 0 0 1 20 0M35 16a17 17 0 0 1-10 20M15 36A17 17 0 0 1 5 16" fill="none" />
            <path d="m20 9 1-4m10 21 4 2M9 26l-4 2" fill="none" />
          </>
        )}
      </g>
    </svg>
  );
}
