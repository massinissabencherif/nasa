import type { CrewStatus, LatestMeasurements, Thresholds } from '@hestia/api-client';
import { IconCheck, IconCaution, IconCritical } from '../icons';
import { INDICATOR_LABELS, ZONE_META, type ZoneKey } from '../zones';
import { formatThresholdBands } from '../thresholdText';
import { StatusBadge } from './StatusBadge';

const LEVEL_ICON = { green: IconCheck, orange: IconCaution, red: IconCritical };

export function ZoneDetailPanel({
  zone,
  status,
  latest,
  thresholds,
  onClose,
}: {
  zone: ZoneKey;
  status: CrewStatus;
  latest: LatestMeasurements | null;
  thresholds: Thresholds | null;
  onClose?: () => void;
}) {
  const meta = ZONE_META[zone];
  const zoneStatus = status[zone];

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

      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{meta.function}</p>

      <div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginBottom: 6 }}>
          HRP hazard: {zoneStatus.hazard}
        </p>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {meta.indicators.map((indicator) => {
          const level = zoneStatus.indicators[indicator];
          const value = latest?.[indicator];
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
                {Icon && <Icon size={14} />}
                <span style={{ fontSize: 'var(--text-sm)' }}>{INDICATOR_LABELS[indicator] ?? indicator}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                {value ? `${value.value}${value.unit ? ` ${value.unit}` : ''}` : level == null ? 'no data' : '—'}
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
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginBottom: 4 }}>Why this matters</p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{meta.why}</p>
      </div>

      {zoneStatus.level !== 'green' && (
        <div
          style={{
            padding: 12,
            borderRadius: 'var(--radius-sm)',
            background: zoneStatus.level === 'red' ? 'var(--red-dim)' : 'var(--orange-dim)',
          }}
        >
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{meta.action}</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 6 }}>
            Indicative only — this is not a diagnosis.
          </p>
        </div>
      )}
    </div>
  );
}
