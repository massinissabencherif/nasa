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
      aria-label="Main"
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
            aria-current={item.active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: 'var(--space-3) var(--space-1) var(--space-2)',
              minHeight: 56,
              border: 'none',
              background: 'none',
              color: item.active ? 'var(--accent)' : 'var(--text-muted)',
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
