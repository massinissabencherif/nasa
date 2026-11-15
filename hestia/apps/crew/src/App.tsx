import { useEffect, useRef } from 'react';
import { t } from '@hestia/ui';
import { HashRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  IconCheckin,
  IconConnection,
  IconHistory,
  IconHome,
  IconMeal,
  IconPantry,
  IconSettings,
  TabBar,
  HestiaMark,
  LanguageSwitch,
  QuickHelp,
  ProjectCredits,
  useLocale,
} from '@hestia/ui';
import { ApiProvider } from './lib/ApiProvider';
import { useConnection, useCrewMember, useMissionContext, useSelectedCrewId } from './lib/hooks';
import { ProfilePicker } from './screens/ProfilePicker';
import { Home } from './screens/Home';
import { Checkin } from './screens/Checkin';
import { Meal } from './screens/Meal';
import { History } from './screens/History';
import { Settings } from './screens/Settings';
import { Pantry } from './screens/Pantry';
import { HealthAssessments } from './screens/HealthAssessments';
import { ReactionSync } from './components/ReactionSync';

const TABS = [
  { key: 'home', label: 'Home', icon: IconHome, path: '/home' },
  { key: 'checkin', label: 'Check-in', icon: IconCheckin, path: '/checkin' },
  { key: 'meal', label: 'Meal', icon: IconMeal, path: '/meal' },
  { key: 'pantry', label: 'Pantry', icon: IconPantry, path: '/pantry' },
  { key: 'history', label: 'History', icon: IconHistory, path: '/history' },
];

function Shell() {
  useLocale();
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
  }, [location.pathname]);
  const navigate = useNavigate();
  const crewId = useSelectedCrewId();
  const crew = useCrewMember(crewId);
  const connected = useConnection();
  const context = useMissionContext();

  const onSettings = location.pathname === '/settings';
  if (crewId == null && location.pathname !== '/profile' && !onSettings) {
    return <Navigate to="/profile" replace />;
  }

  const showTabs = crewId != null && location.pathname !== '/profile' && !onSettings;

  const items = TABS.map((tab) => ({
    key: tab.key,
    label: t(tab.label),
    icon: tab.icon,
    active: location.pathname === tab.path,
    onClick: () => navigate(tab.path),
  }));

  return (
    <div className="hz-mission-shell" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header
        style={{
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
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
          <Link
            className="hz-home-link"
            to={crewId == null ? '/profile' : '/home'}
            aria-label={t('HESTIA · Home', 'HESTIA · Accueil')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            <HestiaMark size={20} aria-hidden="true" />
            {t('HESTIA')}
          </Link>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-faint)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {t(context?.label ?? 'Crew app')}
            {crew && showTabs ? ` · ${crew.name}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <QuickHelp />
          <LanguageSwitch />
          <button
            onClick={() => navigate(onSettings ? (crewId != null ? '/home' : '/profile') : '/settings')}
            className="hz-icon-button"
            aria-label={t('Settings')}
            style={{
              background: 'none',
              border: 'none',
              color: onSettings ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: 6,
            }}
          >
            <IconSettings size={20} />
          </button>
        </div>
        <span
          style={{
            gridColumn: '1 / -1',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 'var(--text-xs)',
            color:
              connected === false ? 'var(--red-ink)' : connected ? 'var(--green-ink)' : 'var(--text-faint)',
          }}
        >
          <IconConnection size={15} />
          {t(connected === false ? 'No station' : connected ? 'Local station' : 'Connecting')}
        </span>
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
          {t('Station unreachable. Check the base Wi-Fi, or tap to set the station address. Retrying…')}
        </button>
      )}

      <main ref={main} style={{ flex: 1, overflow: 'auto' }}>
        <div className="hz-page" key={location.pathname}>
          <Routes>
            <Route path="/" element={<Navigate to={crewId != null ? '/home' : '/profile'} replace />} />
            <Route path="/profile" element={<ProfilePicker />} />
            <Route path="/home" element={<Home />} />
            <Route path="/checkin" element={<Checkin />} />
            <Route path="/assessments" element={<HealthAssessments key={crewId} />} />
            <Route path="/assessments/history" element={<HealthAssessments key={crewId} historyOnly />} />
            <Route path="/meal" element={<Meal />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/shelf" element={<Navigate to="/pantry" replace />} />
          </Routes>
        </div>
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
        {t('SIMULATED data · indicative thresholds · not a medical device')}
      </p>
      {location.pathname === '/settings' && (
        <div style={{ textAlign: 'center', fontSize: 'var(--text-xs)' }}>
          <ProjectCredits names />
        </div>
      )}
      {showTabs && <TabBar items={items} />}
    </div>
  );
}

function App() {
  return (
    <ApiProvider>
      <ReactionSync />
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
