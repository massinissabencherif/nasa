import { useState, useSyncExternalStore } from 'react';
import { Button, ReactionHistory } from '@hestia/ui';
import { ReactionTest } from '../components/ReactionTest';
import { useApi } from '../lib/ApiProvider';
import { useSelectedCrewId } from '../lib/hooks';
import { installationId, pendingReactions, reactionSyncRevision, subscribeReactionSync, syncReactions } from '../lib/reactionStorage';

export function HealthAssessments() {
  const api = useApi();
  const crewId = useSelectedCrewId();
  const [testing, setTesting] = useState(false);
  const [deviceId] = useState(installationId);
  useSyncExternalStore(subscribeReactionSync, reactionSyncRevision);
  if (crewId == null) return null;
  if (testing) return <ReactionTest crewId={crewId} onCancel={() => setTesting(false)} backLabel="Back to assessments" />;
  const pending = pendingReactions(api.baseUrl, crewId);
  return <div className="assessment-stack" style={{ padding: 'var(--space-4)' }}>
    <h1>Health assessments</h1>
    <p>Reaction time test · about one to two minutes. Results are informational and do not change your body-zone colours.</p>
    <Button variant="primary" size="lg" onClick={() => setTesting(true)}>Start reaction time test</Button>
    {pending.length > 0 && <div className="assessment-stack assessment-notice">
      <p role="status">{pending.length} session(s) pending sync with this station.</p>
      {pending.map((entry) => <p key={entry.body.id} className="assessment-muted">{new Date(entry.body.started_at).toLocaleString('en-GB')} · {entry.body.status} · {entry.persisted ? 'copy kept on this device' : 'no local copy: keep this page open'}{entry.error && ` · ${entry.error}`}</p>)}
      <Button onClick={() => { void syncReactions(api, crewId); }}>Retry saving</Button>
    </div>}
    <ReactionHistory api={api} crewId={crewId} deviceId={deviceId ?? undefined} />
  </div>;
}
