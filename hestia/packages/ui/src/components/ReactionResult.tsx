import type { ReactNode } from 'react';
import { t, dateLocale } from '../i18n';
import type { ReactionSessionDetail, ReactionSessionSummary, ReactionTrialInput } from '@hestia/api-client';
import { IconHistory, IconReaction } from '../icons';
import '../styles/reaction.css';

function ReactionReference({ result }: { result: ReactionSessionSummary }) {
  const reference = result.reference;
  const difference = reference.difference_ms;
  let title: string;
  let explanation: string;

  if (result.status !== 'complete') {
    title = t('Incomplete test', 'Test incomplet');
    explanation = t(
      'These attempts are saved, but this test is excluded from your personal reference.',
      'Ces essais sont enregistrés, mais ce test ne compte pas dans votre référence personnelle.',
    );
  } else if (result.median_ms == null) {
    title = t('No comparison available', 'Aucune comparaison possible');
    explanation = t(
      'This test has no valid response and cannot build your personal reference.',
      'Ce test ne contient aucune réponse valide et ne peut pas construire votre référence personnelle.',
    );
  } else if (difference != null && reference.median_ms != null) {
    const duration = Math.round(Math.abs(difference));
    title =
      difference === 0
        ? t('Same as your reference', 'Identique à votre référence')
        : difference > 0
          ? t(`${duration} ms slower`, `${duration} ms plus lent`)
          : t(`${duration} ms faster`, `${duration} ms plus rapide`);
    explanation = t(
      `Compared with ${Math.round(reference.median_ms)} ms across ${reference.count} earlier comparable tests.`,
      `Par rapport à ${Math.round(reference.median_ms)} ms sur ${reference.count} tests précédents comparables.`,
    );
    if (reference.difference_pct != null) {
      const percent = Math.abs(reference.difference_pct).toLocaleString(dateLocale(), {
        maximumFractionDigits: 1,
      });
      explanation += t(` Difference: ${percent}%.`, ` Écart : ${percent} %.`);
    }
  } else if (!result.device_id) {
    title = t('Device not identified', 'Appareil non identifié');
    explanation = t(
      'Without this browser’s identifier, this test cannot be compared with your earlier tests on the same device.',
      'Sans l’identifiant de ce navigateur, ce test ne peut pas être comparé aux précédents sur le même appareil.',
    );
  } else {
    title = t('Your reference is building', 'Votre référence se construit');
    explanation = t(
      `${reference.count}/${reference.required} earlier comparable tests recorded.`,
      `${reference.count}/${reference.required} tests précédents comparables enregistrés.`,
    );
  }

  return (
    <div className="hz-guide-note reaction-reference">
      <h3>
        <IconHistory size={18} aria-hidden="true" />
        {title}
      </h3>
      <p>{explanation}</p>
    </div>
  );
}

export function ReactionResult({ result }: { result: ReactionSessionSummary }) {
  return (
    <div className="assessment-stack reaction-result">
      <div className="reaction-result-overview">
        <div>
          <p className="reaction-result-label">
            <IconReaction size={18} aria-hidden="true" />
            {t('Median reaction time', 'Temps de réaction médian')}
          </p>
          <p className={result.median_ms == null ? 'reaction-empty' : 'reaction-result-number'}>
            {result.median_ms == null ? (
              t('No valid response', 'Aucune réponse valide')
            ) : (
              <>
                {Math.round(result.median_ms)} <span>ms</span>
              </>
            )}
          </p>
          <p className="assessment-muted">
            {result.source === 'simulated'
              ? t('Simulated test', 'Test simulé')
              : t('Measured on the test device', 'Mesuré sur l’appareil du test')}
          </p>
        </div>
        <dl className="reaction-counts">
          <div>
            <dt>{t('Valid', 'Valides')}</dt>
            <dd>{result.valid_responses}</dd>
          </div>
          <div>
            <dt>{t('Early taps', 'Trop tôt')}</dt>
            <dd>{result.false_starts}</dd>
          </div>
          <div>
            <dt>{t('Missed', 'Sans réponse')}</dt>
            <dd>{result.no_responses}</dd>
          </div>
        </dl>
      </div>
      <ReactionReference result={result} />
      <p className="assessment-muted">
        {t('No fatigue diagnosis or fitness assessment.', 'Ni diagnostic de fatigue, ni test d’aptitude.')}
      </p>
    </div>
  );
}

export function ReactionTrials({ trials }: { trials: ReactionTrialInput[] }) {
  const valid = trials.filter((trial) => trial.outcome === 'valid' && trial.reaction_ms != null);
  const maximum = Math.max(1, ...valid.map((trial) => trial.reaction_ms!));
  // Keep longer historical protocols readable without squeezing their labels.
  const columns = trials.length <= 8;
  const outcomeLabels = {
    false_start: t('Too early', 'Trop tôt'),
    no_response: t('No response', 'Sans réponse'),
    interrupted: t('Interrupted', 'Interrompu'),
  };
  return (
    <figure className="reaction-trials-figure">
      <figcaption>
        <h3>
          {t('Your measured trials', 'Vos essais mesurés')}{' '}
          <span>{valid.length > 0 && t(`0–${Math.round(maximum)} ms`, `0–${Math.round(maximum)} ms`)}</span>
        </h3>
        <p className="assessment-muted">
          {columns
            ? t('Lower bar = faster response.', 'Barre plus basse = réponse plus rapide.')
            : t('Shorter bar = faster response.', 'Barre plus courte = réponse plus rapide.')}
        </p>
      </figcaption>
      {trials.length === 0 ? (
        <p className="assessment-muted">{t('No measured attempt.', 'Aucun essai mesuré.')}</p>
      ) : (
        <ol
          className="reaction-trials"
          data-layout={columns ? 'columns' : 'rows'}
          style={columns ? { gridTemplateColumns: `repeat(${trials.length}, minmax(0, 1fr))` } : undefined}
        >
          {trials.map((trial, index) => (
            <li key={index}>
              <span aria-label={t(`Trial ${trial.trial_number}`, `Essai ${trial.trial_number}`)}>
                {trial.trial_number}
              </span>
              <div className="reaction-track" aria-hidden="true">
                {trial.outcome === 'valid' && trial.reaction_ms != null && (
                  <span
                    className="reaction-bar"
                    style={{ [columns ? 'height' : 'width']: `${(trial.reaction_ms / maximum) * 100}%` }}
                  />
                )}
              </div>
              <span>
                {trial.outcome === 'valid'
                  ? trial.reaction_ms == null
                    ? '—'
                    : `${Math.round(trial.reaction_ms)} ms`
                  : outcomeLabels[trial.outcome]}
              </span>
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}

export function ReactionSessionView({
  result,
  actions,
}: {
  result: ReactionSessionDetail;
  actions?: ReactNode;
}) {
  return (
    <div className="reaction-session">
      <div className="assessment-stack reaction-session-main">
        <ReactionResult result={result} />
      </div>
      <ReactionTrials trials={result.trials} />
      {actions && <div className="reaction-result-actions">{actions}</div>}
      <details className="hz-help-answer reaction-method">
        <summary>
          {t('Understand this result and its limits', 'Comprendre le résultat et ses limites')}
        </summary>
        <dl className="hz-guide-definitions">
          <div>
            <dt>{t('The median', 'La médiane')}</dt>
            <dd>
              {t(
                'The middle time when valid responses are sorted (the mean of the two middle times if there is an even number). Practice is excluded. Early taps and missed signals have no reaction time.',
                'Le temps au milieu des réponses valides classées par durée (la moyenne des deux valeurs centrales si leur nombre est pair). L’entraînement est exclu. Les départs anticipés et absences de réponse n’ont pas de temps mesuré.',
              )}
            </dd>
          </div>
          <div>
            <dt>{t('A personal comparison', 'Une comparaison personnelle')}</dt>
            <dd>
              {t(
                'Only earlier complete tests with the same protocol, browser installation and data source are compared. Keep the same device and similar conditions: an identifier cannot guarantee them.',
                'Seuls les tests précédents complets, de même protocole, sur la même installation du navigateur et avec le même type de données sont comparés. Gardez le même appareil et des conditions similaires : un identifiant ne les garantit pas.',
              )}
            </dd>
            <dd className="reaction-protocol">
              {t('Recorded protocol:', 'Protocole enregistré :')} {result.protocol_version}
            </dd>
          </div>
          <div>
            <dt>{t('What it does not tell you', 'Ce qu’il ne dit pas')}</dt>
            <dd>
              {t(
                'Distraction, the screen and input delay affect the time. This is not a validated PVT, a fatigue diagnosis or a fitness-for-duty test. It does not change your body-zone colours.',
                'La distraction, l’écran et le délai de saisie influencent le temps. Ce n’est ni un PVT validé, ni un diagnostic de fatigue, ni un test d’aptitude. Il ne change pas la couleur des zones du corps.',
              )}
            </dd>
          </div>
        </dl>
      </details>
    </div>
  );
}
