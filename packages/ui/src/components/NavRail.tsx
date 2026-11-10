import type { ComponentType } from 'react';

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
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          padding: '2px 10px 22px',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', letterSpacing: '-0.01em' }}>
          HESTIA
        </span>
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={item.onClick}
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
