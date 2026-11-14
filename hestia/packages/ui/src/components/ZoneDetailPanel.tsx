import type { CrewStatus, Thresholds } from '@hestia/api-client';
import { IconCheck, IconCaution, IconCritical } from '../icons';
import { CONTEXT_ZONE_NOTES, INDICATOR_LABELS, ZONE_META, type ZoneKey } from '../zones';
import { formatThresholdBands } from '../thresholdText';
import { LEVEL_META, StatusBadge } from './StatusBadge';

function formatAge(iso: string | null): string {
  if (!iso) return 'an unknown date';
  // the server stores UTC and sends it without a zone
  const then = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`).getTime();
  const hours = Math.max(0, Math.round((Date.now() - then) / 3_600_000));
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}

const LEVEL_ICON = { green: IconCheck, orange: IconCaution, red: IconCritical };

export function ZoneDetailPanel({
  zone,
  status,
  thresholds,
  contextType,
  onClose,
}: {
  zone: ZoneKey;
  status: CrewStatus;
  thresholds: Thresholds | null;
  contextType?: string;
  onClose?: () => void;
}) {
  const meta = ZONE_META[zone];
  const zoneStatus = status[zone];
  const contextNote = contextType ? CONTEXT_ZONE_NOTES[contextType]?.[zone] : undefined;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{meta.label}</h2>
          <StatusBadge level={zoneStatus.level} />
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 'var(--text-lg)', padding: 4 }}
          >
            ×
          </button>
        )}
      </div>

      {zoneStatus.reason && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}>
          {zoneStatus.reason === 'no_data'
            ? 'Nothing has been recorded for this zone yet. No data is not the same as nominal: do a check-in.'
            : `The last reading is from ${formatAge(zoneStatus.last_ts)} and was ${
                zoneStatus.last_level ? LEVEL_META[zoneStatus.last_level].word : 'not judged'
              }. It is too old to stand for today: do a check-in.`}
        </p>
      )}

      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{meta.function}</p>

      <div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginBottom: 6 }}>
          HRP hazard: {zoneStatus.hazard}
        </p>
        {contextNote && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)' }}>{contextNote}</p>
        )}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {meta.indicators.map((indicator) => {
          const level = zoneStatus.indicators[indicator];
          const Icon = level ? LEVEL_ICON[level] : null;
          return (
            <div
              key={indicator}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: 'var(--panel-raised)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {Icon && level && <Icon size={14} color={`var(--${level})`} />}
                <span style={{ fontSize: 'var(--text-sm)' }}>{INDICATOR_LABELS[indicator] ?? indicator}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {zoneStatus.display?.[indicator] ?? 'no data'}
              </span>
            </div>
          );
        })}
      </div>

      {thresholds && (
        <div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginBottom: 6 }}>
            Indicative thresholds
          </p>
          <div style={{ display: 'grid', gap: 4 }}>
            {meta.indicators
              .filter((i) => thresholds[i])
              .map((i) => (
                <p key={i} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {INDICATOR_LABELS[i] ?? i}: {formatThresholdBands(thresholds[i])}
                </p>
              ))}
          </div>
        </div>
      )}

      <div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginBottom: 4 }}>Why this exam matters</p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{meta.why}</p>
      </div>

      {(
        <div
          style={{
            padding: 12,
            borderRadius: 'var(--radius-sm)',
            background:
              zoneStatus.level === 'red' ? 'var(--red-dim)' : zoneStatus.level === 'orange' ? 'var(--orange-dim)' : 'var(--panel-raised)',
          }}
        >
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginBottom: 4 }}>
            {zoneStatus.level === 'green' || zoneStatus.level === 'unknown' ? 'Preventive action' : 'Advised action'}
          </p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{meta.action}</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 6 }}>
            Indicative only — this is not a diagnosis.
          </p>
        </div>
      )}
    </div>
  );
}
