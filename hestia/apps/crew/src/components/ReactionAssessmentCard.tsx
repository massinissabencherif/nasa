import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactionSessionSummary } from '@hestia/api-client';
import { Button, Panel } from '@hestia/ui';
import { useApi } from '../lib/ApiProvider';
import { installationId, pendingReactions, reactionSyncRevision, subscribeReactionSync } from '../lib/reactionStorage';

export function ReactionAssessmentCard({ crewId, onOpen }: { crewId: number; onOpen: () => void }) {
  const api = useApi();
  const [latest, setLatest] = useState<ReactionSessionSummary | null | undefined>();
  const [error, setError] = useState(false);
  const [deviceId] = useState(installationId);
  const revision = useSyncExternalStore(subscribeReactionSync, reactionSyncRevision);
  const pending = pendingReactions(api.baseUrl, crewId).length;
  useEffect(() => {
    let active = true;
    api.getReactionSessions(crewId, { limit: 1, ...(deviceId ? { device_id: deviceId } : {}) })
      .then((rows) => { if (active) { setLatest(rows[0] ?? null); setError(false); } })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [api, crewId, deviceId, revision]);
  return <Panel title="Health assessments">
    <div className="assessment-stack">
      <p>Reaction time · 3 practice + 15 measured trials</p>
      {error ? <p role="status">Station unavailable. Latest result could not be refreshed.</p>
        : latest === undefined ? <p role="status">Loading latest session…</p>
          : latest ? <p className="assessment-muted">Latest{deviceId ? ' on this installation' : ''}: {new Date(latest.started_at).toLocaleString('en-GB')} · {latest.status} · {latest.source === 'simulated' ? 'SIMULATED' : 'measured on device'} · {latest.median_ms == null ? 'no valid response' : `${Math.round(latest.median_ms)} ms median`}</p>
            : <p className="assessment-muted">No session recorded{deviceId ? ' on this installation' : ''}.</p>}
      {pending > 0 && <p role="status">{pending} session(s) pending sync with this station.</p>}
      <Button onClick={onOpen}>Open health assessments</Button>
    </div>
  </Panel>;
}
