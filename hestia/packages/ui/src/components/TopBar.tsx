import { MissionIllustration } from './MissionIllustration';
import { t } from '../i18n';
import { QuickHelp } from './QuickHelp';
import { LanguageSwitch } from './LanguageSwitch';
import { useEffect, useState } from 'react';
import { IconClock, IconConnection } from '../icons';

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Tag({ children }: { children: string }) {
  return (
    <span
      style={{
        fontSize: 'var(--text-xs)',
        color: 'var(--text-faint)',
        border: '1px solid var(--border)',
        borderRadius: 3,
        padding: '3px 8px',
      }}
    >
      {children}
    </span>
  );
}

export function TopBar({
  contextLabel,
  contextType,
  earthDelayLabel,
  connected,
}: {
  contextLabel: string;
  contextType?: string;
  earthDelayLabel?: string;
  connected: boolean;
}) {
  const now = useClock();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <header
      style={{
        height: 52,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid var(--border)',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        {contextType && <MissionIllustration context={contextType} size={32} />}
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t(contextLabel)}</span>
        {earthDelayLabel && (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {t('Earth reply in')} {t(earthDelayLabel)} {t('(round trip)')}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <QuickHelp />
        <LanguageSwitch />
        <Tag>{t('SIMULATED')}</Tag>
        <Tag>{t('Not a medical device')}</Tag>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: connected ? 'var(--green-ink)' : 'var(--red-ink)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <IconConnection size={15} />
          {t(connected ? 'Local server ready' : 'Local server unavailable')}
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: 'var(--text-muted)',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <IconClock size={15} />
          {time}
        </span>
      </div>
    </header>
  );
}
