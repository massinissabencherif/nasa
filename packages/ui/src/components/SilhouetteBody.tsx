import type { KeyboardEvent } from 'react';
import type { CrewStatus, Level } from '@hestia/api-client';
import type { ZoneKey } from '../zones';

const LEVEL_COLOR: Record<Level, string> = {
  green: 'var(--green)',
  orange: 'var(--orange)',
  red: 'var(--red)',
};

type ZoneShape = { key: ZoneKey; points?: string; shape: 'polygon' | 'ellipse' | 'rect'; props: Record<string, number>; badge: [number, number] };

const SHAPES: ZoneShape[] = [
  { key: 'brain_morale', shape: 'ellipse', props: { cx: 100, cy: 38, rx: 26, ry: 30 }, badge: [122, 18] },
  { key: 'eyes_sans', shape: 'rect', props: { x: 76, y: 29, width: 48, height: 11, rx: 5.5 }, badge: [126, 30] },
  {
    key: 'heart',
    shape: 'polygon',
    points: '58,84 142,84 118,148 82,148',
    props: {},
    badge: [132, 96],
  },
  {
    key: 'digestive_nutrition',
    shape: 'polygon',
    points: '82,148 118,148 122,194 78,194',
    props: {},
    badge: [128, 160],
  },
  {
    key: 'bones',
    shape: 'polygon',
    points: '78,194 122,194 130,222 70,222',
    props: {},
    badge: [136, 204],
  },
  { key: 'immunity', shape: 'rect', props: { x: 88, y: 64, width: 24, height: 14, rx: 3 }, badge: [120, 60] },
  {
    key: 'skin',
    shape: 'polygon',
    points: '56,88 76,92 70,232 50,228',
    props: {},
    badge: [40, 150],
  },
  {
    key: 'muscles',
    shape: 'polygon',
    points: '70,222 98,222 94,406 68,406',
    props: {},
    badge: [60, 310],
  },
];

// mirrored right arm + right leg, drawn separately (no separate zone — same zone as left)
const MIRROR_EXTRA = [
  { points: '144,88 124,92 130,232 150,228' }, // right arm (skin)
  { points: '102,222 130,222 132,406 106,406' }, // right leg (muscles)
];

function Badge({ x, y, level }: { x: number; y: number; level: Level }) {
  if (level === 'green') return null;
  const color = LEVEL_COLOR[level];
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={8} fill="var(--bg)" stroke={color} strokeWidth={1.4} />
      {level === 'orange' ? (
        <g stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M0 -3.6v2.6" />
          <circle cx={0} cy={2.6} r={0.6} fill={color} stroke="none" />
        </g>
      ) : (
        <g stroke={color} strokeWidth={1.4} strokeLinecap="round">
          <path d="M-3 -3l6 6M3 -3l-6 6" />
        </g>
      )}
    </g>
  );
}

export function SilhouetteBody({
  status,
  onSelectZone,
  selectedZone,
  interactive = true,
  width = 200,
}: {
  status: CrewStatus | null;
  onSelectZone?: (zone: ZoneKey) => void;
  selectedZone?: ZoneKey | null;
  interactive?: boolean;
  width?: number;
}) {
  const levelFor = (zone: ZoneKey): Level => status?.[zone]?.level ?? 'green';

  function zoneProps(zone: ZoneKey) {
    const level = levelFor(zone);
    const selected = selectedZone === zone;
    return {
      fill: LEVEL_COLOR[level],
      fillOpacity: selected ? 1 : 0.82,
      stroke: selected ? 'var(--text)' : 'var(--border)',
      strokeWidth: selected ? 2 : 1,
      style: { transition: 'fill 300ms ease, fill-opacity 200ms ease', cursor: interactive ? 'pointer' : 'default' },
      onClick: interactive && onSelectZone ? () => onSelectZone(zone) : undefined,
      tabIndex: interactive ? 0 : -1,
      role: interactive ? 'button' : undefined,
      'aria-label': interactive ? `${zone}: ${level}` : undefined,
      onKeyDown: interactive && onSelectZone
        ? (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') onSelectZone(zone);
          }
        : undefined,
    };
  }

  const skinLevel = levelFor('skin');
  const musclesLevel = levelFor('muscles');

  return (
    <svg viewBox="0 0 200 420" width={width} height={(width / 200) * 420} role="img" aria-label="Crew member body status">
      {/* right arm mirrors the skin zone, right leg mirrors muscles */}
      <polygon points={MIRROR_EXTRA[0].points} {...zoneProps('skin')} />
      <polygon points={MIRROR_EXTRA[1].points} {...zoneProps('muscles')} />

      {SHAPES.map((s) => {
        if (s.shape === 'polygon') {
          return <polygon key={s.key} points={s.points} {...zoneProps(s.key)} />;
        }
        if (s.shape === 'ellipse') {
          return <ellipse key={s.key} {...s.props} {...zoneProps(s.key)} />;
        }
        return <rect key={s.key} {...s.props} {...zoneProps(s.key)} />;
      })}

      {/* eye pupils drawn on top, not part of the hit target's fill semantics */}
      <circle cx={90} cy={34.5} r={2.6} fill="var(--bg)" />
      <circle cx={110} cy={34.5} r={2.6} fill="var(--bg)" />

      {SHAPES.map((s) => (
        <Badge key={`badge-${s.key}`} x={s.badge[0]} y={s.badge[1]} level={levelFor(s.key)} />
      ))}
      <Badge x={160} y={150} level={skinLevel} />
      <Badge x={140} y={310} level={musclesLevel} />
    </svg>
  );
}
