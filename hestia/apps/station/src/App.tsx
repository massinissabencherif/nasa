import { t } from '@hestia/ui';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  IconAlert,
  IconCrew,
  IconEarthLink,
  IconForecast,
  IconPantry,
  IconSettings,
  NavRail,
  ProjectCredits,
  TopBar,
  useLocale,
} from '@hestia/ui';
import { API_BASE } from './lib/api';
import { formatDelay, StationContext, useStationState } from './lib/hooks';
import { CrewProfile } from './screens/CrewProfile';
import { CrewScreen } from './screens/CrewScreen';
import { PantryScreen } from './screens/PantryScreen';
import { CalibrationScreen } from './screens/CalibrationScreen';
import { ForecastsScreen } from './screens/ForecastsScreen';
import { AlertsScreen } from './screens/AlertsScreen';
import { EarthScreen } from './screens/EarthScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { StationViewport } from './components/StationViewport';

const NAV = [
  // health first: the crew, what needs attention, what went to Earth; then the resources
  { key: 'crew', label: 'Crew', icon: IconCrew, path: '/crew' },
  { key: 'alerts', label: 'Alerts', icon: IconAlert, path: '/alerts' },
  { key: 'earth', label: 'Earth link', icon: IconEarthLink, path: '/earth' },
  { key: 'pantry', label: 'Pantry', icon: IconPantry, path: '/pantry' },
  { key: 'forecasts', label: 'Management simulator', icon: IconForecast, path: '/forecasts' },
  { key: 'settings', label: 'Mission settings', icon: IconSettings, path: '/settings' },
];

function ServerDown() {
  return (
    <div style={{ maxWidth: 560, margin: '80px auto', textAlign: 'center', display: 'grid', gap: 12 }}>
      <h1 style={{ fontSize: 'var(--text-xl)' }}>{t('Station server unreachable')}</h1>
      <p style={{ color: 'var(--text-muted)' }}>
        {t('The station app cannot reach')}
        <span style={{ fontFamily: 'var(--font-mono)' }}>{API_BASE}</span>
        {t('. Start it with')}
      </p>
      <pre
        style={{
          margin: 0,
          padding: 14,
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-sm)',
          textAlign: 'left',
        }}
      >
        {t('cd server && uv run hestia-server')}
      </pre>
      <p style={{ color: 'var(--text-faint)', fontSize: 'var(--text-sm)' }}>
        {t('This screen reconnects by itself every few seconds. Nothing is sent outside this machine.')}
      </p>
    </div>
  );
}

function Shell() {
  useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const station = useStationState();
  const { connected, context } = station;

  const items = NAV.map((n) => ({
    key: n.key,
    label: t(n.label),
    icon: n.icon,
    active: location.pathname.startsWith(n.path),
    onClick: () => navigate(n.path),
  }));

  return (
    <StationContext.Provider value={station}>
      <div className="hz-mission-shell" style={{ display: 'flex', height: '100%' }}>
        <NavRail items={items} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <TopBar
            contextType={context?.type}
            contextLabel={context?.label ?? (connected === false ? 'No server' : 'Loading context…')}
            earthDelayLabel={context ? formatDelay(context.delay_s * 2) : undefined}
            connected={connected === true}
          />
          <main style={{ flex: 1, overflow: 'auto', padding: 20 }}>
            {connected === false ? (
              <ServerDown />
            ) : (
              <div className="hz-page" key={location.pathname}>
                <Routes>
                  <Route path="/" element={<Navigate to="/crew" replace />} />
                  <Route path="/crew" element={<CrewScreen />} />
                  <Route path="/crew/:crewId/:section?" element={<CrewProfile />} />
                  <Route path="/pantry" element={<PantryScreen />} />
                  <Route path="/pantry/calibration" element={<CalibrationScreen />} />
                  <Route path="/forecasts" element={<ForecastsScreen />} />
                  <Route path="/alerts" element={<AlertsScreen />} />
                  <Route path="/earth" element={<EarthScreen />} />
                  <Route path="/settings" element={<SettingsScreen />} />
                </Routes>
              </div>
            )}
          </main>
          <footer
            style={{
              flexShrink: 0,
              padding: '6px 20px',
              borderTop: '1px solid var(--border-soft)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-faint)',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <span>
              {t('Simulated crew and data · indicative thresholds · not a medical device, no diagnosis')}
            </span>
            <ProjectCredits names />
          </footer>
        </div>
      </div>
    </StationContext.Provider>
  );
}

function App() {
  return (
    <HashRouter>
      <StationViewport>
        <Shell />
      </StationViewport>
    </HashRouter>
  );
}

export default App;
