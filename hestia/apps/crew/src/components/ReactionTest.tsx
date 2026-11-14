import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import type { ReactionProtocol } from '@hestia/api-client';
import { Button, Panel, ReactionSessionView, ReactionTrials } from '@hestia/ui';
import { useApi } from '../lib/ApiProvider';
import { previewReaction, ReactionRunner, type ReactionState } from '../lib/reactionTest';
import {
  installationId, loadReactionProtocol, pendingReactions, queueReaction, randomId,
  reactionSyncRevision, savedReaction, subscribeReactionSync, syncReactions,
} from '../lib/reactionStorage';

export function ReactionTest({ crewId, onCancel, backLabel = 'Back' }: { crewId: number; onCancel: () => void; backLabel?: string }) {
  const api = useApi();
  const [protocol, setProtocol] = useState<ReactionProtocol | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    loadReactionProtocol(api).then((value) => { if (active) { setProtocol(value); setError(null); } })
      .catch(() => { if (active) setError('Connect to the station once to load the test protocol.'); });
    return () => { active = false; };
  }, [api, retry]);
  if (!protocol) return <div className="assessment-stack" style={{ padding: 'var(--space-4)' }}>
    <p role={error ? 'alert' : 'status'}>{error ?? 'Loading test protocol…'}</p>
    {error && <Button onClick={() => setRetry((value) => value + 1)}>Retry</Button>}
    <Button onClick={onCancel}>{backLabel}</Button>
  </div>;
  return <TestSession key={`${api.baseUrl}:${crewId}:${protocol.version}`} protocol={protocol} crewId={crewId} onCancel={onCancel} backLabel={backLabel} />;
}

function TestSession({ protocol, crewId, onCancel, backLabel }: { protocol: ReactionProtocol; crewId: number; onCancel: () => void; backLabel: string }) {
  const api = useApi();
  const [deviceId] = useState(installationId);
  const [rendered, setRendered] = useState<ReactionState | null>(null);
  const pad = useRef<HTMLButtonElement>(null);
  const [runner] = useState(() => new ReactionRunner(protocol, deviceId, {
    now: () => performance.now(), date: () => new Date().toISOString(), random: Math.random, id: randomId,
    later: (callback, ms) => window.setTimeout(callback, ms), cancel: window.clearTimeout.bind(window),
    frame: requestAnimationFrame.bind(window), cancelFrame: cancelAnimationFrame.bind(window),
  }, (next, signal) => {
    if (signal) flushSync(() => setRendered(next));
    else setRendered(next);
    if (next.result) {
      queueReaction(api.baseUrl, crewId, next.result);
      void syncReactions(api, crewId);
    }
  }));
  const state = rendered ?? runner.state;
  useSyncExternalStore(subscribeReactionSync, reactionSyncRevision);
  const result = state.result ? savedReaction(state.result.id) : undefined;
  const pending = state.result ? pendingReactions(api.baseUrl, crewId).find((entry) => entry.body.id === state.result!.id) : undefined;
  const preview = previewReaction(state.trials);

  useEffect(() => {
    const interrupt = () => runner.interrupt();
    const visibility = () => { if (document.hidden) interrupt(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', interrupt);
    window.addEventListener('pagehide', interrupt);
    return () => {
      runner.interrupt();
      runner.dispose();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('blur', interrupt);
      window.removeEventListener('pagehide', interrupt);
    };
  }, [runner]);
  useEffect(() => {
    if (state.phase === 'wait') pad.current?.focus({ preventScroll: true });
  }, [state.phase]);

  if (state.phase === 'intro') return (
    <div className="assessment-stack" style={{ padding: 'var(--space-4)' }}>
      <h1>Reaction time test</h1>
      <p>{protocol.practice_trials} practice trials, then {protocol.measured_trials} measured trials. Allow about one to two minutes.</p>
      <p>Wait until the panel says “Tap now”, then tap it. You can also use a mouse, Space or Enter. A tap before the signal is a false start; it repeats that trial.</p>
      <p className="assessment-muted">Use the same device and similar conditions each time. Distraction, screen refresh and input latency can affect the result. This is not a validated PVT, a fatigue diagnosis or an operational fitness test.</p>
      {!deviceId && <p role="alert">This browser cannot store an installation identifier. A device-matched reference will be unavailable.</p>}
      <Button variant="primary" size="lg" onClick={() => runner.start()}>Start practice</Button>
      <Button onClick={onCancel}>{backLabel}</Button>
    </div>
  );

  if (state.phase === 'done' || state.phase === 'paused') return (
    <div className="assessment-stack" style={{ padding: 'var(--space-4)' }}>
      <h1>{state.phase === 'done' ? 'Reaction test complete' : state.result?.status === 'abandoned' ? 'Reaction test abandoned' : 'Reaction test interrupted'}</h1>
      {state.feedback && <p role="status">{state.feedback}</p>}
      {result ? (
        <><p role="status">Saved on the station.</p><Panel><ReactionSessionView result={result} /></Panel></>
      ) : (
        <div className="assessment-stack assessment-notice">
          <p role="status">{pending?.persisted ? 'Pending sync — a copy is kept on this device for this station.' : 'Not saved on the station yet. Keep this screen open.'}</p>
          <p className="assessment-number">{preview.median == null ? 'No valid response' : `${Math.round(preview.median)} ms median`}</p>
          <p>{preview.valid} valid responses · {preview.falseStarts} false starts · {preview.noResponses} no responses</p>
          <p className="assessment-muted">Local preview. The station will recompute statistics and compare eligible sessions after saving.{state.result?.status !== 'complete' && ' This incomplete session is excluded from your personal reference.'}</p>
          <ReactionTrials trials={state.trials} />
          {pending?.error && <p className="assessment-muted">{pending.error}</p>}
          <Button onClick={() => { void syncReactions(api, crewId); }}>Retry saving</Button>
        </div>
      )}
      <div className="assessment-actions">
        {state.phase === 'done' ? (
          <>
            <Button variant="primary" onClick={onCancel}>{backLabel}</Button>
            <Button onClick={() => runner.start()}>Do it again</Button>
          </>
        ) : (
          <>
            <Button variant="primary" onClick={() => runner.start()}>Restart from practice</Button>
            <Button onClick={onCancel}>{backLabel}</Button>
          </>
        )}
      </div>
    </div>
  );

  if (state.phase === 'ready') return (
    <div className="assessment-stack" style={{ padding: 'var(--space-4)' }}>
      <h1>Practice complete</h1>
      <p>Your practice responses were not recorded. The next {protocol.measured_trials} trials form your measured session.</p>
      <Button variant="primary" size="lg" onClick={() => runner.startMeasured()}>Start measured test</Button>
      <Button onClick={() => runner.abandon()}>Abandon session</Button>
    </div>
  );

  const label = state.phase === 'go' ? 'Tap now' : state.phase === 'wait' ? 'Wait for the signal' : state.feedback;
  return (
    <div className="assessment-stack" style={{ padding: 'var(--space-4)' }}>
      <p>{state.mode === 'practice' ? 'Practice' : 'Measured trial'} {state.trialNumber} / {state.mode === 'practice' ? protocol.practice_trials : protocol.measured_trials}</p>
      <button ref={pad} className="reaction-pad" data-phase={state.phase} aria-label={label}
        onPointerDown={(event) => { if (event.isPrimary && event.button === 0) { event.preventDefault(); runner.tap(); } }}
        onKeyDown={(event) => {
          if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); if (!event.repeat) runner.tap(); }
        }}>
        <strong>{label}</strong>
        {state.phase === 'wait' && <span>Respond only when “Tap now” appears</span>}
      </button>
      <p className="assessment-muted">Switching tabs or leaving this app interrupts the session. No network request is used to time a response.</p>
      <Button onClick={() => runner.abandon()}>Abandon session</Button>
    </div>
  );
}
