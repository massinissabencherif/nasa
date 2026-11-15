import { ZoneIllustration } from './ZoneIllustration';
import { t } from '../i18n';
import { useRef, useState, type KeyboardEvent } from 'react';
import { useVisibleMotion } from '../useVisibleMotion';
import { Button } from './Button';
import type { CrewStatus, ZoneLevel } from '@hestia/api-client';
import { ZONE_META, type ZoneKey } from '../zones';

const LEVEL_COLOR: Record<ZoneLevel, string> = {
  green: 'var(--green)',
  orange: 'var(--orange)',
  red: 'var(--red)',
  unknown: 'var(--text-faint)',
};
// nominal zones stay quiet so that an orange or red zone is what the eye finds first
const LEVEL_FILL_OPACITY: Record<ZoneLevel, number> = { green: 0.14, orange: 0.8, red: 0.88, unknown: 0.12 };
const LEVEL_WORD: Record<ZoneLevel, string> = {
  green: 'nominal',
  orange: 'caution',
  red: 'critical',
  unknown: 'no data',
};
const LEVEL_INK: Record<ZoneLevel, string> = {
  // nominal is said in words and with a tick, in a quiet tone: colour is kept for what needs attention
  green: 'var(--text-faint)',
  orange: 'var(--orange-ink)',
  red: 'var(--red-ink)',
  unknown: 'var(--text-faint)',
};
const LEVEL_MARK: Record<ZoneLevel, string> = { green: '✓', orange: '!', red: '✕', unknown: '–' };

// Hand-drawn front view, 200 x 440 units. Each zone is one or two closed paths.
const ZONE_PATHS: Record<ZoneKey, string[]> = {
  // cranium: upper part of the head
  brain_morale: ['M76,40 C76,20 86,10 100,10 C114,10 124,20 124,40 Z'],
  // eye band
  eyes_sans: ['M76,42 L124,42 L123,52 C122,55 120,56 117,56 L83,56 C80,56 78,55 77,52 Z'],
  // neck and collar (lymph nodes, airways)
  immunity: ['M90,70 L110,70 L111,80 C118,82 126,84 132,87 L68,87 C74,84 82,82 89,80 Z'],
  // chest
  heart: ['M68,89 L132,89 C133,108 131,128 127,148 L73,148 C69,128 67,108 68,89 Z'],
  // abdomen
  digestive_nutrition: ['M73,150 L127,150 C125,166 125,182 127,196 L73,196 C75,182 75,166 73,150 Z'],
  // pelvis and hips
  bones: [
    'M73,198 L127,198 C130,208 132,218 132,228 L101,228 L100,222 L99,228 L68,228 C68,218 70,208 73,198 Z',
  ],
  // both arms
  skin: [
    'M66,88 C56,89 50,95 49,106 L42,214 C41,224 43,236 50,238 C57,239 59,230 60,220 L68,128 C68,114 67,100 66,88 Z',
    'M134,88 C144,89 150,95 151,106 L158,214 C159,224 157,236 150,238 C143,239 141,230 140,220 L132,128 C132,114 133,100 134,88 Z',
  ],
  // both legs
  muscles: [
    'M68,230 L99,230 L96,330 L94,404 C94,416 90,422 83,422 C76,422 72,416 72,404 L70,330 Z',
    'M132,230 L101,230 L104,330 L106,404 C106,416 110,422 117,422 C124,422 128,416 128,404 L130,330 Z',
  ],
};

// lower face, drawn in the neutral body colour (not a zone)
const FACE_PATH = 'M77,58 L123,58 C121,66 114,70 100,70 C86,70 79,66 77,58 Z';

type LabelSpec = { zone: ZoneKey; side: 'left' | 'right'; y: number; anchorX: number };

const LABELS: LabelSpec[] = [
  { zone: 'brain_morale', side: 'right', y: 24, anchorX: 121 },
  { zone: 'eyes_sans', side: 'left', y: 49, anchorX: 78 },
  { zone: 'immunity', side: 'right', y: 78, anchorX: 112 },
  { zone: 'heart', side: 'left', y: 116, anchorX: 72 },
  { zone: 'skin', side: 'right', y: 150, anchorX: 156 },
  { zone: 'digestive_nutrition', side: 'left', y: 174, anchorX: 76 },
  { zone: 'bones', side: 'right', y: 212, anchorX: 128 },
  { zone: 'muscles', side: 'left', y: 320, anchorX: 72 },
];

const BADGES: Record<ZoneKey, [number, number]> = {
  brain_morale: [100, 26],
  eyes_sans: [100, 49],
  immunity: [100, 80],
  heart: [82, 118],
  digestive_nutrition: [100, 173],
  bones: [100, 211],
  skin: [51, 160],
  muscles: [84, 320],
};

function Badge({ x, y, level }: { x: number; y: number; level: ZoneLevel }) {
  if (level === 'green' || level === 'unknown') return null;
  const color = LEVEL_COLOR[level];
  return (
    <g transform={`translate(${x},${y})`} pointerEvents="none">
      <circle r={8.5} fill="var(--bg)" stroke={color} strokeWidth={1.6} />
      {level === 'orange' ? (
        <g stroke={color} strokeWidth={1.8} strokeLinecap="round" fill="none">
          <path d="M0 -4v4" />
          <circle cx={0} cy={3.4} r={0.7} fill={color} stroke="none" />
        </g>
      ) : (
        <g stroke={color} strokeWidth={1.8} strokeLinecap="round">
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
  showLabels = false,
  width = 200,
  motionSuppressed = false,
}: {
  status: CrewStatus | null;
  onSelectZone?: (zone: ZoneKey) => void;
  selectedZone?: ZoneKey | null;
  interactive?: boolean;
  /** side labels with the zone name and its status word (never colour alone) */
  showLabels?: boolean;
  width?: number;
  /** A modal can cover an otherwise intersecting body on mobile. */
  motionSuppressed?: boolean;
}) {
  const [focused, setFocused] = useState<ZoneKey | null>(null);
  const [motionPaused, setMotionPaused] = useState(false);
  const body = useRef<SVGSVGElement>(null);
  const motionVisible = useVisibleMotion(body, selectedZone === 'heart' && !motionSuppressed);
  // nothing loaded yet is "unknown", never green
  const levelFor = (zone: ZoneKey): ZoneLevel => status?.[zone]?.level ?? 'unknown';
  const clickable = interactive && Boolean(onSelectZone);

  function handlers(zone: ZoneKey, label = false) {
    if (!clickable) return {};
    return {
      onClick: () => onSelectZone!(zone),
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectZone!(zone);
        }
      },
      tabIndex: showLabels && !label ? -1 : 0,
      onFocus: () => setFocused(zone),
      onBlur: () => setFocused(null),
      className: 'hz-zone-target',
      role: 'button' as const,
      'aria-label': `${t(ZONE_META[zone].label)}: ${t(LEVEL_WORD[levelFor(zone)])}`,
      'aria-pressed': selectedZone === zone,
      style: { cursor: 'pointer' },
    };
  }

  const viewBox = showLabels ? '-118 0 436 440' : '0 0 200 440';
  const vbWidth = showLabels ? 436 : 200;
  const zones = Object.keys(ZONE_PATHS) as ZoneKey[];

  return (
    <div className="hz-body-view" style={{ width }}>
      <svg
        ref={body}
        data-motion={motionVisible && !motionPaused ? 'running' : 'paused'}
        viewBox={viewBox}
        width={width}
        height={(width / vbWidth) * 440}
        role={clickable ? 'group' : 'img'}
        aria-label={t('Body status by zone')}
        style={{ maxWidth: '100%', height: 'auto', overflow: 'visible' }}
      >
        <style>{`
        .hz-zone-target:focus { outline: none; }
        .hz-zone-target:focus-visible text { fill: var(--accent); }
        .hz-zone { transition: fill 500ms ease, fill-opacity 500ms ease, stroke 500ms ease; }
        @keyframes hz-pulse { 0%, 100% { fill-opacity: 0.88; } 50% { fill-opacity: 0.55; } }
        .hz-red { animation: hz-pulse 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .hz-red { animation: none; } .hz-zone { transition: none; } }
      `}</style>

        <path d={FACE_PATH} fill="var(--panel-raised)" stroke="var(--border)" strokeWidth={1} />

        {zones.map((zone) => {
          const level = levelFor(zone);
          const selected = selectedZone === zone || focused === zone;
          return (
            <g key={zone} {...handlers(zone)}>
              {ZONE_PATHS[zone].map((d) => (
                <path
                  key={d}
                  d={d}
                  className={`hz-zone${level === 'red' ? ' hz-red' : ''}`}
                  fill={LEVEL_COLOR[level]}
                  fillOpacity={LEVEL_FILL_OPACITY[level]}
                  stroke={selected ? 'var(--accent)' : LEVEL_COLOR[level]}
                  strokeDasharray={level === 'unknown' ? '3 3' : undefined}
                  strokeWidth={selected ? 2.4 : 1.2}
                  strokeLinejoin="round"
                />
              ))}
            </g>
          );
        })}

        {selectedZone && (
          <g data-zone-context={selectedZone}>
            <ZoneIllustration zone={selectedZone} />
          </g>
        )}

        {/* pupils, purely decorative */}
        {selectedZone !== 'eyes_sans' && (
          <>
            <circle cx={90} cy={49} r={2.4} fill="var(--bg)" pointerEvents="none" />
            <circle cx={110} cy={49} r={2.4} fill="var(--bg)" pointerEvents="none" />
          </>
        )}

        {zones.map((zone) => (
          <Badge key={`badge-${zone}`} x={BADGES[zone][0]} y={BADGES[zone][1]} level={levelFor(zone)} />
        ))}
        <Badge x={149} y={160} level={levelFor('skin')} />
        <Badge x={116} y={320} level={levelFor('muscles')} />

        {showLabels &&
          LABELS.map(({ zone, side, y, anchorX }) => {
            const level = levelFor(zone);
            const selected = selectedZone === zone || focused === zone;
            const textX = side === 'right' ? 176 : 24;
            const lineEnd = side === 'right' ? 170 : 30;
            return (
              <g key={`label-${zone}`} {...handlers(zone, true)}>
                <rect
                  className="hz-zone-label-hit"
                  x={side === 'right' ? 166 : -116}
                  y={y - 17}
                  width={148}
                  height={40}
                  rx={5}
                  fill={selected ? 'var(--accent-dim)' : 'transparent'}
                  stroke={selected ? 'var(--accent)' : 'transparent'}
                  strokeWidth={focused === zone ? 2 : 1}
                />
                <line
                  x1={anchorX}
                  y1={y}
                  x2={lineEnd}
                  y2={y}
                  stroke="var(--decor)"
                  strokeWidth={0.8}
                  strokeDasharray="2 3"
                  pointerEvents="none"
                />
                <circle cx={anchorX} cy={y} r={2} fill="var(--text-muted)" pointerEvents="none" />
                <text
                  x={textX}
                  y={y - 1}
                  textAnchor={side === 'right' ? 'start' : 'end'}
                  fontSize={13}
                  fontWeight={selected ? 700 : 500}
                  fill={selected ? 'var(--text)' : 'var(--text-muted)'}
                  fontFamily="var(--font-sans)"
                >
                  {zone === 'skin' ? (
                    <>
                      <tspan x={textX} dy={-5}>
                        {t('Radiation')}
                      </tspan>
                      <tspan x={textX} dy={13}>
                        {t('exposure')}
                      </tspan>
                    </>
                  ) : zone === 'digestive_nutrition' ? (
                    'Nutrition'
                  ) : (
                    t(ZONE_META[zone].label)
                  )}
                </text>
                <text
                  x={textX}
                  y={y + (zone === 'skin' ? 22 : 13)}
                  textAnchor={side === 'right' ? 'start' : 'end'}
                  fontSize={11}
                  fill={LEVEL_INK[level]}
                  fontFamily="var(--font-sans)"
                >
                  {LEVEL_MARK[level]} {t(LEVEL_WORD[level])}
                </text>
              </g>
            );
          })}
      </svg>
      {selectedZone === 'heart' && !motionSuppressed && (
        <div className="hz-body-motion">
          <span>{t('Illustrative beat', 'Battement illustratif')}</span>
          <Button
            size="sm"
            variant="ghost"
            aria-label={t(
              motionPaused ? 'Resume heart animation' : 'Pause heart animation',
              motionPaused ? 'Reprendre l’animation du cœur' : 'Mettre l’animation du cœur en pause',
            )}
            onClick={() => setMotionPaused((value) => !value)}
          >
            {t(motionPaused ? 'Resume' : 'Pause', motionPaused ? 'Reprendre' : 'Pause')}
          </Button>
        </div>
      )}
    </div>
  );
}
