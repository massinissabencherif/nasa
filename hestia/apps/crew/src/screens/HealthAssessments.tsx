import { Link } from 'react-router-dom';
import { t } from '@hestia/ui';
import { useState, useSyncExternalStore } from 'react';
import { Button, ReactionHistory } from '@hestia/ui';
import { ReactionTest } from '../components/ReactionTest';
import { useApi } from '../lib/ApiProvider';
import { useSelectedCrewId } from '../lib/hooks';
import {
  installationId,
  pendingReactions,
  reactionSyncRevision,
  subscribeReactionSync,
  syncReactions,
} from '../lib/reactionStorage';

export function HealthAssessments({ historyOnly = false }: { historyOnly?: boolean }) {
  const api = useApi();
  const crewId = useSelectedCrewId();
  const [testing, setTesting] = useState(false);
  const [deviceId] = useState(installationId);
  useSyncExternalStore(subscribeReactionSync, reactionSyncRevision);
  if (crewId == null) return null;
  if (testing)
    return (
      <ReactionTest
        crewId={crewId}
        onCancel={() => setTesting(false)}
        backLabel={t('Back to reaction results')}
      />
    );
  const pending = pendingReactions(api.baseUrl, crewId);
  return (
    <div className="assessment-stack" style={{ padding: 'var(--space-4)' }}>
      <Link to={historyOnly ? '/assessments' : '/home'} className="hz-back-link">
        ← {t(historyOnly ? 'Back to reaction test' : 'Home')}
      </Link>
      <h1>{historyOnly ? t('Reaction results', 'Résultats de réaction') : t('Reaction time')}</h1>
      <p>
        {t(
          'Reaction time test · about 30 seconds. Results are informational and do not change your body-zone colours.',
          'Test de réaction · environ 30 secondes. Le résultat est informatif et ne change pas la couleur des zones du corps.',
        )}
      </p>
      {!historyOnly && (
        <Button variant="primary" size="lg" onClick={() => setTesting(true)}>
          {t('Start reaction time test')}
        </Button>
      )}
      {pending.length > 0 && (
        <div className="assessment-stack assessment-notice">
          <p role="status">
            {pending.length} {t('session(s) pending sync with this station.')}
          </p>
          {pending.map((entry) => (
            <p key={entry.body.id} className="assessment-muted">
              {new Date(entry.body.started_at).toLocaleString('en-GB')} · {entry.body.status} ·{' '}
              {entry.persisted ? 'copy kept on this device' : 'no local copy: keep this page open'}
              {entry.error && ` · ${entry.error}`}
            </p>
          ))}
          <Button
            onClick={() => {
              void syncReactions(api, crewId);
            }}
          >
            {t('Retry saving')}
          </Button>
        </div>
      )}
      {historyOnly ? (
        <ReactionHistory api={api} crewId={crewId} deviceId={deviceId ?? undefined} />
      ) : (
        <Link className="hz-back-link" to="/assessments/history">
          {t('View results', 'Voir les résultats')} →
        </Link>
      )}
    </div>
  );
}
