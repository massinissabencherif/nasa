import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ZoneLevel } from '@hestia/api-client';
import {
  LoadingState,
  LoadError,
  Panel,
  ReactionHistory,
  ScienceSources,
  SilhouetteBody,
  ZoneDetailPanel,
  ZONES,
  t,
  type ZoneKey,
} from '@hestia/ui';
import { api } from '../lib/api';
import { useCrewProfile, useStation, useThresholds } from '../lib/hooks';

const ORDER: Record<ZoneLevel, number> = { red: 0, orange: 1, unknown: 2, green: 3 };

/** A profile is a destination: browser Back and a direct URL both work. */
export function CrewProfile() {
  const { crewId, section } = useParams();
  const { context } = useStation();
  const { member, status, kind, refresh } = useCrewProfile(crewId ?? '');
  const thresholds = useThresholds();
  const [selectedZone, setSelectedZone] = useState<ZoneKey | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const activeZone =
    selectedZone ??
    (status ? [...ZONES].sort((a, b) => ORDER[status[a].level] - ORDER[status[b].level])[0] : null);

  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [crewId]);

  return (
    <article className="hz-crew-profile">
      <Link className="hz-back-link" to="/crew">
        ← {t('Back to crew', 'Retour à l’équipage')}
      </Link>
      <header className="hz-profile-heading">
        <h1 ref={title} tabIndex={-1}>
          {member?.name ?? t('Crew profile', 'Profil d’équipage')}
        </h1>
        <p>{t('Fictional crew member · simulated readings', 'Profil fictif · mesures simulées')}</p>
      </header>
      <nav className="hz-profile-tabs" aria-label={t('Profile sections', 'Sections du profil')}>
        <Link to={`/crew/${crewId}`} aria-current={!section ? 'page' : undefined}>
          {t('Body overview', 'Vue du corps')}
        </Link>
        <Link to={`/crew/${crewId}/reactions`} aria-current={section === 'reactions' ? 'page' : undefined}>
          {t('Reaction results', 'Résultats de réaction')}
        </Link>
      </nav>
      {kind === 'loading' && <LoadingState label={t('Loading the profile…', 'Chargement du profil…')} />}
      {kind === 'error' && (
        <LoadError
          label={t(
            'Could not load this profile. Check the station connection.',
            'Impossible de charger ce profil. Vérifiez la connexion à la station.',
          )}
          onRetry={refresh}
        />
      )}
      {kind === 'missing' && (
        <p>
          {t(
            'This crew profile does not exist. Return to the crew list.',
            'Ce profil n’existe pas. Revenez à la liste d’équipage.',
          )}
        </p>
      )}
      {member && status && (
        <>
          {section !== 'reactions' && (
            <>
              <div className="hz-profile-health">
                <section className="hz-profile-body" aria-label={t('Body overview', 'Vue du corps')}>
                  <SilhouetteBody
                    status={status}
                    width={340}
                    showLabels
                    selectedZone={activeZone}
                    onSelectZone={setSelectedZone}
                  />
                  <p>
                    {t(
                      'Select a zone to see its readings and explanation.',
                      'Choisissez une zone pour voir ses mesures et leur explication.',
                    )}
                  </p>
                </section>
                <Panel elevated>
                  {activeZone && (
                    <ZoneDetailPanel
                      zone={activeZone}
                      status={status}
                      thresholds={thresholds}
                      contextType={context?.type}
                    />
                  )}
                </Panel>
              </div>
              <ScienceSources />
            </>
          )}
          {section === 'reactions' && <ReactionHistory api={api} crewId={member.id} />}
        </>
      )}
    </article>
  );
}
