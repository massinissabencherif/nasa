/** Authored navigation illustrations. Decorative, not imagery or scientific data. */
export function MissionIllustration({ context, size = 56 }: { context: string; size?: number }) {
  const earth = context === 'earth' || context === 'iss';
  const moon = context === 'moon_base';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="hz-mission-illustration"
    >
      <circle
        cx="32"
        cy="32"
        r="23"
        fill={earth ? 'var(--planet-earth)' : moon ? 'var(--planet-moon)' : 'var(--planet-mars)'}
      />
      {earth ? (
        <>
          <path
            d="m17 18 11-6 5 6-3 7-8 3-3 8-8-4 1-9zm22 10 12-3 3 12-7 11-7-4-2-8z"
            fill="var(--planet-land)"
          />
          <path
            d="M18 45c6 4 11 6 20 4M30 17l15 5"
            stroke="var(--planet-cloud)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : moon ? (
        <g fill="var(--planet-crater)" stroke="var(--planet-crater-edge)" strokeWidth="1">
          <circle cx="24" cy="23" r="6" />
          <circle cx="41" cy="38" r="8" />
          <circle cx="20" cy="41" r="3" />
          <circle cx="43" cy="18" r="3" />
        </g>
      ) : (
        <>
          <path
            d="m13 25 13-4 8 7 16-3M18 43l13-6 15 6"
            stroke="var(--planet-mars-detail)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M24 11q8-4 17 1l-7 3z" fill="var(--planet-mars-ice)" />
        </>
      )}
      <path d="M40 11a23 23 0 0 1-8 44c15-11 16-28 8-44" fill="var(--planet-night)" fillOpacity=".25" />
      {context === 'iss' && (
        <g stroke="var(--text)" strokeWidth="1.5" fill="var(--station-solar-panel)">
          <path d="m36 17 15-9 4 7-15 9zM42 18l-4-7M49 14l-4-7M39 19l-7 4" />
        </g>
      )}
      {context === 'mars_transit' && (
        <path d="M4 43C-1 21 34 4 60 20" stroke="var(--accent)" strokeDasharray="3 4" strokeLinecap="round" />
      )}
    </svg>
  );
}
