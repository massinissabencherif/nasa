import type { ComponentType } from 'react';

export type TabItem = {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  active: boolean;
  onClick: () => void;
};

export function TabBar({ items }: { items: TabItem[] }) {
  return (
    <nav
      style={{
        display: 'flex',
        borderTop: '1px solid var(--border)',
        background: 'var(--panel)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        flexShrink: 0,
      }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={item.onClick}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '10px 4px 8px',
              border: 'none',
              background: 'none',
              color: item.active ? 'var(--accent)' : 'var(--text-faint)',
              fontSize: 'var(--text-xs)',
              fontWeight: item.active ? 600 : 500,
              cursor: 'pointer',
            }}
          >
            <Icon size={21} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
