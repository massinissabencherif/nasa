import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { IconCheckin, IconHistory, IconHome, IconMeal, TabBar } from '@hestia/ui';
import { ApiProvider } from './lib/ApiProvider';
import { useSelectedCrewId } from './lib/hooks';
import { ProfilePicker } from './screens/ProfilePicker';
import { Home } from './screens/Home';
import { Checkin } from './screens/Checkin';
import { Meal } from './screens/Meal';
import { History } from './screens/History';
import { Settings } from './screens/Settings';

const TABS = [
  { key: 'home', label: 'Home', icon: IconHome, path: '/home' },
  { key: 'checkin', label: 'Check-in', icon: IconCheckin, path: '/checkin' },
  { key: 'meal', label: 'Meal', icon: IconMeal, path: '/meal' },
  { key: 'history', label: 'History', icon: IconHistory, path: '/history' },
];

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const crewId = useSelectedCrewId();

  if (crewId == null && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  const showTabs = crewId != null && location.pathname !== '/profile' && location.pathname !== '/settings';

  const items = TABS.map((t) => ({
    key: t.key,
    label: t.label,
    icon: t.icon,
    active: location.pathname === t.path,
    onClick: () => navigate(t.path),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/profile" replace />} />
          <Route path="/profile" element={<ProfilePicker />} />
          <Route path="/home" element={<Home />} />
          <Route path="/checkin" element={<Checkin />} />
          <Route path="/meal" element={<Meal />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      {showTabs && <TabBar items={items} />}
    </div>
  );
}

function App() {
  return (
    <ApiProvider>
      <HashRouter>
        <div
          style={{
            height: '100%',
            maxWidth: 480,
            margin: '0 auto',
            background: 'var(--bg)',
            borderLeft: '1px solid var(--border)',
            borderRight: '1px solid var(--border)',
          }}
        >
          <Shell />
        </div>
      </HashRouter>
    </ApiProvider>
  );
}

export default App;
