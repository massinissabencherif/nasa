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
  earthDelayLabel,
  connected,
}: {
  contextLabel: string;
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
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{contextLabel}</span>
        {earthDelayLabel && (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Earth reply in {earthDelayLabel}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <Tag>SIMULATED</Tag>
        <Tag>Not a medical device</Tag>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: connected ? 'var(--green)' : 'var(--red)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <IconConnection size={15} />
          {connected ? 'Connected' : 'Offline'}
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
