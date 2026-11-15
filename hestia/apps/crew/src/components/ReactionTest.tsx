import { t } from '@hestia/ui';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import type { ReactionProtocol } from '@hestia/api-client';
import { Button, Panel, ReactionSessionView, ReactionTrials } from '@hestia/ui';
import { useApi } from '../lib/ApiProvider';
import { previewReaction, ReactionRunner, type ReactionState } from '../lib/reactionTest';
import {
  installationId,
  loadReactionProtocol,
  pendingReactions,
  queueReaction,
  randomId,
  reactionSyncRevision,
  savedReaction,
  subscribeReactionSync,
  syncReactions,
} from '../lib/reactionStorage';

export function ReactionTest({
  crewId,
  onCancel,
  backLabel = 'Back',
}: {
  crewId: number;
  onCancel: () => void;
  backLabel?: string;
}) {
  const api = useApi();
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 });
  }, []);
  const [protocol, setProtocol] = useState<ReactionProtocol | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    loadReactionProtocol(api)
      .then((value) => {
        if (active) {
          setProtocol(value);
          setError(null);
        }
      })
      .catch(() => {
        if (active) setError('Connect to the station once to load the test protocol.');
      });
    return () => {
      active = false;
    };
  }, [api, retry]);
  if (!protocol)
    return (
      <div className="assessment-stack" style={{ padding: 'var(--space-4)' }}>
        <p role={error ? 'alert' : 'status'}>{error ?? 'Loading test protocol…'}</p>
        {error && <Button onClick={() => setRetry((value) => value + 1)}>{t('Retry')}</Button>}
        <Button onClick={onCancel}>{backLabel}</Button>
      </div>
    );
  return (
    <TestSession
      key={`${api.baseUrl}:${crewId}:${protocol.version}`}
      protocol={protocol}
      crewId={crewId}
      onCancel={onCancel}
      backLabel={backLabel}
    />
  );
}

function TestSession({
  protocol,
  crewId,
  onCancel,
  backLabel,
}: {
  protocol: ReactionProtocol;
  crewId: number;
  onCancel: () => void;
  backLabel: string;
}) {
  const api = useApi();
  const [deviceId] = useState(installationId);
  const [rendered, setRendered] = useState<ReactionState | null>(null);
  const pad = useRef<HTMLButtonElement>(null);
  const [runner] = useState(
    () =>
      new ReactionRunner(
        protocol,
        deviceId,
        {
          now: () => performance.now(),
          date: () => new Date().toISOString(),
          random: Math.random,
          id: randomId,
          later: (callback, ms) => window.setTimeout(callback, ms),
          cancel: window.clearTimeout.bind(window),
          frame: requestAnimationFrame.bind(window),
          cancelFrame: cancelAnimationFrame.bind(window),
        },
        (next, signal) => {
          if (signal) flushSync(() => setRendered(next));
          else setRendered(next);
          if (next.result) {
            queueReaction(api.baseUrl, crewId, next.result);
            void syncReactions(api, crewId);
          }
        },
      ),
  );
  const state = rendered ?? runner.state;
  useSyncExternalStore(subscribeReactionSync, reactionSyncRevision);
  const result = state.result ? savedReaction(state.result.id) : undefined;
  const pending = state.result
    ? pendingReactions(api.baseUrl, crewId).find((entry) => entry.body.id === state.result!.id)
    : undefined;
  const preview = previewReaction(state.trials);

  useEffect(() => {
    const interrupt = () => runner.interrupt();
    const visibility = () => {
      if (document.hidden) interrupt();
    };
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

  if (state.phase === 'intro')
    return (
      <div className="assessment-stack" style={{ padding: 'var(--space-4)' }}>
        <h1>{t('Reaction time test')}</h1>
        <p>
          {t(
            `${protocol.practice_trials} practice trial${protocol.practice_trials === 1 ? '' : 's'}, then ${protocol.measured_trials} measured trials.`,
            `${protocol.practice_trials} essai${protocol.practice_trials === 1 ? '' : 's'} d’entraînement, puis ${protocol.measured_trials} essais mesurés.`,
          )}{' '}
          {protocol.version === 'reaction-5-v1'
            ? t('Allow about 30 seconds.', 'Prévoyez environ 30 secondes.')
            : t('Allow about one to two minutes.', 'Prévoyez environ une à deux minutes.')}
        </p>
        <p>
          {t(
            'Wait until the panel says “Tap now”, then tap it. You can also use a mouse, Space or Enter. A tap before the signal is a false start; it repeats that trial.',
          )}
        </p>
        <Button variant="primary" size="lg" onClick={() => runner.start()}>
          {t('Start practice')}
        </Button>
        <p className="assessment-muted">
          {t(
            'Use the same device and similar conditions each time. Distraction, screen refresh and input latency can affect the result. This is not a validated PVT, a fatigue diagnosis or an operational fitness test.',
          )}
        </p>
        {!deviceId && (
          <p role="alert">
            {t(
              'This browser cannot store an installation identifier. A device-matched reference will be unavailable.',
            )}
          </p>
        )}

        <Button onClick={onCancel}>{backLabel}</Button>
      </div>
    );

  if (state.phase === 'done' || state.phase === 'paused') {
    const actions = (
      <div className="assessment-actions">
        {state.phase === 'done' ? (
          <>
            <Button variant="primary" onClick={onCancel}>
              {backLabel}
            </Button>
            <Button onClick={() => runner.start()}>{t('Do it again')}</Button>
          </>
        ) : (
          <>
            <Button variant="primary" onClick={() => runner.start()}>
              {t('Restart from practice')}
            </Button>
            <Button onClick={onCancel}>{backLabel}</Button>
          </>
        )}
      </div>
    );
    return (
      <div className="assessment-stack" style={{ padding: 'var(--space-4)' }}>
        <header className="reaction-completion-heading">
          <h1>
            {t(
              state.phase === 'done'
                ? 'Reaction test complete'
                : state.result?.status === 'abandoned'
                  ? 'Reaction test abandoned'
                  : 'Reaction test interrupted',
            )}
          </h1>
          {result && <p role="status">{t('Saved on the station.')}</p>}
        </header>
        {state.feedback && <p role="status">{t(state.feedback)}</p>}
        {result ? (
          <Panel>
            <ReactionSessionView result={result} actions={actions} />
          </Panel>
        ) : (
          <div className="assessment-stack assessment-notice">
            <p role="status">
              {pending?.persisted
                ? t(
                    'Waiting to save on the station. A copy is kept on this device.',
                    'En attente d’enregistrement sur la station. Une copie est conservée sur cet appareil.',
                  )
                : t(
                    'Not saved on the station yet. Keep this screen open.',
                    'Pas encore enregistré sur la station. Gardez cet écran ouvert.',
                  )}
            </p>
            <p className="reaction-result-label">
              {t('Local preview · median time', 'Aperçu local · temps médian')}
            </p>
            <p className={preview.median == null ? 'reaction-empty' : 'reaction-result-number'}>
              {preview.median == null ? (
                t('No valid response', 'Aucune réponse valide')
              ) : (
                <>
                  {Math.round(preview.median)} <span>ms</span>
                </>
              )}
            </p>
            <p>
              {preview.valid} {t('valid responses ·')} {preview.falseStarts} {t('false starts ·')}{' '}
              {preview.noResponses} {t('no responses')}
            </p>
            <p className="assessment-muted">
              {t(
                'Local preview. The station will recompute statistics and compare eligible sessions after saving.',
              )}
              {state.result?.status !== 'complete' &&
                t(
                  ' This incomplete session is excluded from your personal reference.',
                  ' Ce test incomplet ne compte pas dans votre référence personnelle.',
                )}
            </p>
            {pending?.error && <p className="assessment-muted">{pending.error}</p>}
            <Button
              onClick={() => {
                void syncReactions(api, crewId);
              }}
            >
              {t('Retry saving')}
            </Button>
            {actions}
            <ReactionTrials trials={state.trials} />
          </div>
        )}
      </div>
    );
  }

  if (state.phase === 'ready')
    return (
      <div className="assessment-stack" style={{ padding: 'var(--space-4)' }}>
        <h1>{t('Practice complete')}</h1>
        <p>
          {t('Your practice responses were not recorded. The next')} {protocol.measured_trials}{' '}
          {t('trials form your measured session.')}
        </p>
        <Button variant="primary" size="lg" onClick={() => runner.startMeasured()}>
          {t('Start measured test')}
        </Button>
        <Button onClick={() => runner.abandon()}>{t('Abandon session')}</Button>
      </div>
    );

  const label = t(
    state.phase === 'go' ? 'Tap now' : state.phase === 'wait' ? 'Wait for the signal' : state.feedback,
  );
  return (
    <div className="assessment-stack" style={{ padding: 'var(--space-4)' }}>
      <p>
        {t(state.mode === 'practice' ? 'Practice' : 'Measured trial')} {state.trialNumber} /{' '}
        {state.mode === 'practice' ? protocol.practice_trials : protocol.measured_trials}
      </p>
      <button
        ref={pad}
        className="reaction-pad"
        data-phase={state.phase}
        aria-label={label}
        onPointerDown={(event) => {
          if (event.isPrimary && event.button === 0) {
            event.preventDefault();
            runner.tap();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            if (!event.repeat) runner.tap();
          }
        }}
      >
        <strong>{label}</strong>
        {state.phase === 'wait' && <span>{t('Respond only when “Tap now” appears')}</span>}
      </button>
      <p className="assessment-muted">
        {t(
          'Switching tabs or leaving this app interrupts the session. No network request is used to time a response.',
        )}
      </p>
      <Button onClick={() => runner.abandon()}>{t('Abandon session')}</Button>
    </div>
  );
}
