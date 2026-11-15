import { t } from '../i18n';
import type { ReactionSessionDetail, ReactionSessionSummary, ReactionTrialInput } from '@hestia/api-client';
import '../styles/reaction.css';

export function ReactionResult({ result }: { result: ReactionSessionSummary }) {
  const reference = result.reference;
  const difference = reference.difference_ms;
  return (
    <div className="assessment-stack">
      <p className="assessment-number">
        {result.median_ms == null ? (
          'No valid response'
        ) : (
          <>
            {Math.round(result.median_ms)} <span>{t('ms median')}</span>
          </>
        )}
      </p>
      <p>
        {result.valid_responses} {t('valid responses ·')} {result.false_starts} {t('false starts ·')}{' '}
        {result.no_responses} {t('no responses')}
      </p>
      {result.status !== 'complete' ? (
        <p>
          {t('This session is')} {result.status}
          {t('. It is excluded from your personal reference.')}
        </p>
      ) : result.median_ms == null ? (
        <p>{t('No valid response to compare in this session. It cannot build your personal reference.')}</p>
      ) : difference != null ? (
        <p>
          {t('Median response time')}{' '}
          {difference === 0
            ? 'matched your recent reference'
            : `was ${Math.round(Math.abs(difference))} ms ${difference > 0 ? 'slower' : 'faster'} than your recent reference`}
          {reference.difference_pct != null && ` (${Math.abs(reference.difference_pct).toFixed(1)}%)`}
          {t('. Reference:')} {Math.round(reference.median_ms!)} {t('ms, from')} {reference.count}{' '}
          {t('earlier complete sessions.')}
        </p>
      ) : (
        <p>
          {result.device_id
            ? `Building your personal reference (${reference.count}/${reference.required} previous comparable sessions).`
            : 'No installation identifier: a device-matched reference is unavailable.'}
        </p>
      )}
      <p className="assessment-muted">
        {t(
          'Same protocol, installation and data source only. An installation identifier does not guarantee identical conditions. This is not a fatigue diagnosis or a fitness-for-duty test.',
        )}
      </p>
    </div>
  );
}

export function ReactionTrials({ trials }: { trials: ReactionTrialInput[] }) {
  const valid = trials.filter((trial) => trial.outcome === 'valid' && trial.reaction_ms != null);
  const maximum = Math.max(1, ...valid.map((trial) => trial.reaction_ms!));
  return (
    <div className="assessment-stack">
      <p className="assessment-muted">
        {t('Measured trials. Invalid attempts have no reaction time; practice is not recorded.')}
      </p>
      <ol className="reaction-trials">
        {trials.map((trial, index) => (
          <li key={index}>
            <span>{trial.trial_number}</span>
            <div>
              {trial.outcome === 'valid' && (
                <span
                  className="reaction-bar"
                  style={{ width: `${(trial.reaction_ms! / maximum) * 100}%` }}
                />
              )}
            </div>
            <span>
              {trial.outcome === 'valid'
                ? `${Math.round(trial.reaction_ms!)} ms`
                : trial.outcome.replace('_', ' ')}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ReactionSessionView({ result }: { result: ReactionSessionDetail }) {
  return (
    <div className="assessment-stack">
      <ReactionResult result={result} />
      <ReactionTrials trials={result.trials} />
    </div>
  );
}
