import { t, dateLocale } from '../i18n';
import { useEffect, useState } from 'react';
import type { ApiClient, ReactionSessionDetail, ReactionSessionSummary } from '@hestia/api-client';
import { Button } from './Button';
import { Panel } from './Panel';
import { ReactionSessionView } from './ReactionResult';

export function ReactionHistory({
  api,
  crewId,
  deviceId,
}: {
  api: ApiClient;
  crewId: number;
  deviceId?: string;
}) {
  // Remount when identity changes so another crew member's results never flash on screen.
  return (
    <History
      key={`${api.baseUrl}:${crewId}:${deviceId ?? 'all'}`}
      api={api}
      crewId={crewId}
      deviceId={deviceId}
    />
  );
}

function History({ api, crewId, deviceId }: { api: ApiClient; crewId: number; deviceId?: string }) {
  const [rows, setRows] = useState<ReactionSessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReactionSessionDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let sequence = 0;
    const load = async () => {
      const request = ++sequence;
      try {
        const value = await api.getReactionSessions(crewId, { device_id: deviceId, limit: 30 });
        if (active && request === sequence) {
          setRows(value);
          setError(null);
        }
      } catch {
        if (active && request === sequence)
          setError('Station unreachable. Displayed results may be out of date.');
      }
    };
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [api, crewId, deviceId, retry]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    api
      .getReactionSession(crewId, selected)
      .then((value) => {
        if (active) {
          setDetail(value);
          setDetailError(null);
        }
      })
      .catch(() => {
        if (active) setDetailError('Could not load this session. Retry when the station is available.');
      });
    return () => {
      active = false;
    };
  }, [api, crewId, selected, retry]);

  const latest = rows?.find((row) => row.status === 'complete' && row.median_ms != null);
  const comparable = latest?.device_id
    ? rows!
        .filter(
          (row) =>
            row.status === 'complete' &&
            row.median_ms != null &&
            row.protocol_version === latest.protocol_version &&
            row.device_id === latest.device_id &&
            row.source === latest.source,
        )
        .reverse()
    : [];
  const maximum = Math.max(
    100,
    Math.ceil(Math.max(0, ...comparable.map((row) => row.median_ms!)) / 100) * 100,
  );
  const points = comparable
    .map(
      (row, index) =>
        `${45 + (index * 255) / Math.max(1, comparable.length - 1)},${110 - (row.median_ms! / maximum) * 90}`,
    )
    .join(' ');
  return (
    <Panel title={t('Recorded tests', 'Tests enregistrés')}>
      <div className="assessment-stack">
        <p className="assessment-muted">
          {t('Latest 30 sessions')}{' '}
          {deviceId
            ? t('on this device', 'sur cet appareil')
            : t('for this crew member', 'pour ce membre d’équipage')}
          {t('. Incomplete sessions do not build a reference.')}
        </p>
        {error && (
          <p role="alert">
            {t(error, 'Station inaccessible. Les résultats affichés peuvent ne pas être à jour.')}{' '}
            <Button size="sm" onClick={() => setRetry((value) => value + 1)}>
              {t('Retry')}
            </Button>
          </p>
        )}
        {rows == null && !error && <p role="status">{t('Loading sessions…')}</p>}
        {rows?.length === 0 && (
          <p>
            {t('No recorded sessions')} {deviceId ? t(' on this installation', ' sur cet appareil') : ''}
            {t('. Missing results do not mean normal health.')}
          </p>
        )}
        {comparable.length > 1 && (
          <figure style={{ margin: 0 }}>
            <svg
              className="reaction-trend"
              viewBox="0 0 320 140"
              role="img"
              aria-label={t(
                `Median reaction times, ${comparable.length} comparable sessions, oldest to newest. Values are listed below.`,
                `Temps médians de ${comparable.length} tests comparables, du plus ancien au plus récent. Les valeurs figurent ci-dessous.`,
              )}
            >
              <path d="M40 15v95h265" fill="none" stroke="var(--border)" />
              <text x="0" y="22" fill="var(--text-muted)" fontSize="11">
                {maximum} ms
              </text>
              <text x="20" y="112" fill="var(--text-muted)" fontSize="11">
                0
              </text>
              <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" />
              <text x="20" y="135" fill="currentColor" fontSize="11">
                {t('Sessions: oldest → newest', 'Séances : ancienne → récente')}
              </text>
            </svg>
            <figcaption className="assessment-muted">
              {t(
                'Median response time in milliseconds. Only completed tests with the same protocol, device and data source are compared.',
                'Temps de réponse médian en millisecondes. Seuls les tests terminés avec le même protocole, appareil et type de données sont comparés.',
              )}
            </figcaption>
          </figure>
        )}
        <ul className="reaction-history-list">
          {rows?.map((row) => (
            <li key={row.id}>
              <button
                className="reaction-history-row"
                aria-expanded={selected === row.id}
                onClick={() => {
                  setSelected(selected === row.id ? null : row.id);
                  setDetail(null);
                  setDetailError(null);
                }}
              >
                {new Date(row.started_at).toLocaleString(dateLocale())} ·{' '}
                {row.median_ms == null
                  ? t('No valid response', 'Aucune réponse valide')
                  : t(`${Math.round(row.median_ms)} ms median`, `${Math.round(row.median_ms)} ms de médiane`)}
                <small>
                  {row.status === 'complete'
                    ? t('Complete', 'Terminé')
                    : row.status === 'abandoned'
                      ? t('Abandoned', 'Abandonné')
                      : t('Interrupted', 'Interrompu')}{' '}
                  ·{' '}
                  {row.source === 'simulated'
                    ? t('Simulated', 'Simulé')
                    : t('Measured on device', 'Mesuré sur l’appareil')}
                </small>
              </button>
              {selected === row.id && (
                <div className="assessment-notice">
                  {detailError ? (
                    <p role="alert">
                      {t(
                        detailError,
                        'Impossible de charger ce test. Réessayez lorsque la station est accessible.',
                      )}{' '}
                      <Button onClick={() => setRetry((value) => value + 1)}>{t('Retry')}</Button>
                    </p>
                  ) : detail ? (
                    <ReactionSessionView result={detail} />
                  ) : (
                    <p role="status">{t('Loading trials…')}</p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
