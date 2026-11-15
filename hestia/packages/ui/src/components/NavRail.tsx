import { t } from '../i18n';
import type { ComponentType } from 'react';
import { HestiaMark } from '../icons';

export type NavItem = {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  active: boolean;
  onClick: () => void;
};

export function NavRail({ items }: { items: NavItem[] }) {
  return (
    <nav
      aria-label={t('Main')}
      style={{
        width: 190,
        flexShrink: 0,
        background: 'var(--panel)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 10px',
        gap: 2,
      }}
    >
      <a
        href="#/crew"
        className="hz-home-link"
        aria-label={t('HESTIA · Crew', 'HESTIA · Équipage')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: '2px 10px 22px',
        }}
      >
        <HestiaMark size={22} aria-hidden="true" />
        <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', letterSpacing: '-0.01em' }}>
          {t('HESTIA')}
        </span>
      </a>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            className="hz-nav-item"
            onClick={item.onClick}
            aria-current={item.active ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 10px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: item.active ? 'var(--accent-dim)' : 'transparent',
              color: item.active ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: 'var(--text-sm)',
              fontWeight: item.active ? 600 : 500,
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <Icon size={16} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
