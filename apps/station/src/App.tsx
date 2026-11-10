import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { IconAlert, IconCrew, IconEarthLink, IconForecast, IconPantry, IconSettings, NavRail, TopBar } from '@hestia/ui';
import { useConnection, useMissionContext } from './lib/hooks';
import { CrewScreen } from './screens/CrewScreen';
import { PantryScreen } from './screens/PantryScreen';
import { CalibrationScreen } from './screens/CalibrationScreen';
import { ForecastsScreen } from './screens/ForecastsScreen';
import { AlertsScreen } from './screens/AlertsScreen';
import { EarthScreen } from './screens/EarthScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const NAV = [
  { key: 'crew', label: 'Crew', icon: IconCrew, path: '/crew' },
  { key: 'pantry', label: 'Pantry', icon: IconPantry, path: '/pantry' },
  { key: 'forecasts', label: 'Forecasts', icon: IconForecast, path: '/forecasts' },
  { key: 'alerts', label: 'Alerts', icon: IconAlert, path: '/alerts' },
  { key: 'earth', label: 'Earth link', icon: IconEarthLink, path: '/earth' },
  { key: 'settings', label: 'Mission settings', icon: IconSettings, path: '/settings' },
];

function minutesLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)} min`;
}

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const connected = useConnection();
  const context = useMissionContext();

  const items = NAV.map((n) => ({
    key: n.key,
    label: n.label,
    icon: n.icon,
    active: location.pathname.startsWith(n.path),
    onClick: () => navigate(n.path),
  }));

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <NavRail items={items} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar
          contextLabel={context?.label ?? 'Loading context…'}
          earthDelayLabel={context ? minutesLabel(context.delay_s) : undefined}
          connected={connected}
        />
        <main style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/pantry" replace />} />
            <Route path="/crew" element={<CrewScreen />} />
            <Route path="/pantry" element={<PantryScreen />} />
            <Route path="/pantry/calibration" element={<CalibrationScreen />} />
            <Route path="/forecasts" element={<ForecastsScreen />} />
            <Route path="/alerts" element={<AlertsScreen />} />
            <Route path="/earth" element={<EarthScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}

export default App;
