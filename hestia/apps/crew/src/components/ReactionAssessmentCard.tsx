import { t } from '@hestia/ui';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactionSessionSummary } from '@hestia/api-client';
import { Button, Panel } from '@hestia/ui';
import { useApi } from '../lib/ApiProvider';
import {
  installationId,
  pendingReactions,
  reactionSyncRevision,
  subscribeReactionSync,
} from '../lib/reactionStorage';

export function ReactionAssessmentCard({
  crewId,
  onOpen,
  onHistory,
}: {
  crewId: number;
  onOpen: () => void;
  onHistory: () => void;
}) {
  const api = useApi();
  const [latest, setLatest] = useState<ReactionSessionSummary | null | undefined>();
  const [error, setError] = useState(false);
  const [deviceId] = useState(installationId);
  const revision = useSyncExternalStore(subscribeReactionSync, reactionSyncRevision);
  const pending = pendingReactions(api.baseUrl, crewId).length;
  useEffect(() => {
    let active = true;
    api
      .getReactionSessions(crewId, { limit: 1, ...(deviceId ? { device_id: deviceId } : {}) })
      .then((rows) => {
        if (active) {
          setLatest(rows[0] ?? null);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [api, crewId, deviceId, revision]);
  return (
    <Panel title={t('Reaction time')}>
      <div className="assessment-stack">
        <p>
          {t(
            'Optional · one practice trial, then five measured trials',
            'Facultatif · un essai d’entraînement, puis cinq mesurés',
          )}
        </p>
        {error ? (
          <p role="status">{t('Station unavailable. Latest result could not be refreshed.')}</p>
        ) : latest === undefined ? (
          <p role="status">{t('Loading latest session…')}</p>
        ) : latest ? (
          <p className="assessment-muted">
            {t('Latest')} {deviceId ? t(' on this installation', ' sur cet appareil') : ''}:{' '}
            {new Date(latest.started_at).toLocaleString('en-GB')} · {latest.status} ·{' '}
            {latest.source === 'simulated' ? 'SIMULATED' : 'measured on device'} ·{' '}
            {latest.median_ms == null ? 'no valid response' : `${Math.round(latest.median_ms)} ms median`}
          </p>
        ) : (
          <p className="assessment-muted">
            {t('No session recorded')} {deviceId ? t(' on this installation', ' sur cet appareil') : ''}.
          </p>
        )}
        {pending > 0 && (
          <p role="status">
            {pending} {t('session(s) pending sync with this station.')}
          </p>
        )}
        <div className="hz-inline-actions">
          <Button onClick={onOpen}>{t('Open reaction test')}</Button>
          <Button onClick={onHistory}>{t('View results', 'Voir les résultats')}</Button>
        </div>
      </div>
    </Panel>
  );
}
