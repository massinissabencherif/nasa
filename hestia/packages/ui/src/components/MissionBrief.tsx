import type { MissionContext } from '@hestia/api-client';
import type { ReactNode } from 'react';
import { t } from '../i18n';
import { IconForecast } from '../icons';
import { MissionIllustration } from './MissionIllustration';
import '../styles/mission.css';

import { MISSION_PROFILES } from '../missions';

export function MissionHeading({ context }: { context: MissionContext }) {
  const profile = MISSION_PROFILES.find((mission) => mission.type === context.type);
  return (
    <div className="hz-mission-heading">
      <MissionIllustration context={context.type} size={40} />
      <div>
        <h3>{t(context.label)}</h3>
        {profile && <p>{t(profile.setting[0], profile.setting[1])}</p>}
      </div>
    </div>
  );
}

export function MissionBrief({ context, children }: { context: MissionContext; children?: ReactNode }) {
  const profile = MISSION_PROFILES.find((mission) => mission.type === context.type);
  return (
    <section className="hz-mission-brief" aria-label={t('Mission overview', 'La mission en bref')}>
      {children}
      {profile && (
        <div className="hz-mission-objective">
          <IconForecast size={20} aria-hidden="true" />
          <div>
            <h4>{t('Your objective in HESTIA', 'Votre objectif dans HESTIA')}</h4>
            <p>{t(profile.goal[0], profile.goal[1])}</p>
            <p className="hz-mission-constraint">{t(profile.constraint[0], profile.constraint[1])}</p>
          </div>
        </div>
      )}
    </section>
  );
}
