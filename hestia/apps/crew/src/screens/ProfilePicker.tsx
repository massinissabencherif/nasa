import { LoadingState, LoadError } from '@hestia/ui';
import { t } from '@hestia/ui';
import { useNavigate } from 'react-router-dom';
import { StationCompanion } from '@hestia/ui';
import { useCrewListState } from '../lib/hooks';
import { setSelectedCrewId } from '../lib/profile';

export function ProfilePicker() {
  const navigate = useNavigate();
  const { data: crew, error, refresh } = useCrewListState();
  return (
    <div style={{ padding: 'var(--space-5)', display: 'grid', gap: 'var(--space-5)' }}>
      <header style={{ display: 'grid', gap: 'var(--space-2)' }}>
        <StationCompanion />
        <h1>{t("Who's checking in?")}</h1>
        <p className="assessment-muted">
          {t("Choose your profile to see your body status and record today's check-in.")}
        </p>
      </header>
      <div className="hz-profile-list">
        {error && (
          <LoadError
            label={t(
              'Could not load the crew. Check the station connection.',
              'Impossible de charger l’équipage. Vérifiez la connexion à la station.',
            )}
            onRetry={refresh}
          />
        )}
        {crew === null && !error && <LoadingState label={t('Connecting to the station…')} />}
        {crew?.length === 0 && !error && (
          <p>{t('No crew profiles on this station.', 'Aucun profil sur cette station.')}</p>
        )}
        {crew?.map((member) => (
          <button
            key={member.id}
            type="button"
            className="hz-profile"
            onClick={() => {
              setSelectedCrewId(member.id);
              navigate('/home');
            }}
          >
            <span className="hz-avatar" aria-hidden="true">
              {member.name
                .split(' ')
                .map((part) => part[0])
                .join('')}
            </span>
            <span style={{ flex: 1 }}>
              <strong>{member.name}</strong>
              <br />
              <span className="assessment-muted">
                {member.age} {t('years · crew member')}
              </span>
            </span>
            <span aria-hidden="true">→</span>
          </button>
        ))}
      </div>
      <p className="assessment-muted">
        {t('Fictional crew · SIMULATED data. Profile selection is not authentication.')}
      </p>
    </div>
  );
}
