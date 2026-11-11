import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { IconCheckin, IconConnection, IconHistory, IconHome, IconMeal, IconSettings, TabBar } from '@hestia/ui';
import { ApiProvider } from './lib/ApiProvider';
import { useConnection, useCrewMember, useMissionContext, useSelectedCrewId } from './lib/hooks';
import { ProfilePicker } from './screens/ProfilePicker';
import { Home } from './screens/Home';
import { Checkin } from './screens/Checkin';
import { Meal } from './screens/Meal';
import { History } from './screens/History';
import { Settings } from './screens/Settings';
import { ShelfCamera } from './screens/ShelfCamera';

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
  const crew = useCrewMember(crewId);
  const connected = useConnection();
  const context = useMissionContext();

  const onSettings = location.pathname === '/settings' || location.pathname === '/shelf';
  if (crewId == null && location.pathname !== '/profile' && !onSettings) {
    return <Navigate to="/profile" replace />;
  }

  const showTabs = crewId != null && location.pathname !== '/profile' && !onSettings;

  const items = TABS.map((t) => ({
    key: t.key,
    label: t.label,
    icon: t.icon,
    active: location.pathname === t.path,
    onClick: () => navigate(t.path),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '10px 16px',
          paddingTop: 'calc(10px + env(safe-area-inset-top))',
          borderBottom: '1px solid var(--border)',
          background: 'var(--panel)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>HESTIA</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {context?.label ?? 'Crew app'}
            {crew && showTabs ? ` · ${crew.name}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 'var(--text-xs)',
              color: connected === false ? 'var(--red)' : connected ? 'var(--green)' : 'var(--text-faint)',
            }}
          >
            <IconConnection size={15} />
            {connected === false ? 'No station' : connected ? 'Station' : 'Connecting'}
          </span>
          <button
            onClick={() => navigate(onSettings ? (crewId != null ? '/home' : '/profile') : '/settings')}
            aria-label="Settings"
            style={{ background: 'none', border: 'none', color: onSettings ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', padding: 6 }}
          >
            <IconSettings size={20} />
          </button>
        </div>
      </header>

      {connected === false && !onSettings && (
        <button
          onClick={() => navigate('/settings')}
          style={{
            flexShrink: 0,
            padding: '10px 16px',
            background: 'var(--red-dim)',
            border: 'none',
            borderBottom: '1px solid var(--red)',
            color: 'var(--text)',
            fontSize: 'var(--text-sm)',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          Station unreachable. Check the base Wi-Fi, or tap to set the station address. Retrying…
        </button>
      )}

      <main style={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<Navigate to={crewId != null ? '/home' : '/profile'} replace />} />
          <Route path="/profile" element={<ProfilePicker />} />
          <Route path="/home" element={<Home />} />
          <Route path="/checkin" element={<Checkin />} />
          <Route path="/meal" element={<Meal />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/shelf" element={<ShelfCamera />} />
        </Routes>
      </main>

      <p
        style={{
          flexShrink: 0,
          padding: '5px 12px',
          fontSize: 10.5,
          textAlign: 'center',
          color: 'var(--text-faint)',
          borderTop: '1px solid var(--border-soft)',
          paddingBottom: showTabs ? 5 : 'calc(5px + env(safe-area-inset-bottom))',
        }}
      >
        SIMULATED data · indicative thresholds · not a medical device
      </p>
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
