import { useState } from 'react';
import { Button, Panel, StatusBadge } from '@hestia/ui';
import { defaultApiBase, getApiBase, setApiBase } from '../lib/apiBase';
import { useConnection } from '../lib/hooks';

export function Settings() {
  const [value, setValue] = useState(getApiBase());
  const connected = useConnection();

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Settings</h1>
      <Panel title="Station connection">
        <div style={{ marginBottom: 12 }}>
          {connected == null ? (
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-faint)' }}>Checking…</span>
          ) : (
            <StatusBadge level={connected ? 'green' : 'red'} label={connected ? 'Station reachable' : 'Station not reachable'} />
          )}
        </div>
        <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-sm)' }}>
          Station address
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="http://192.168.1.20:8000"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            style={{
              background: 'var(--panel-raised)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              fontFamily: 'var(--font-mono)',
              fontSize: 16,
            }}
          />
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button variant="primary" onClick={() => setApiBase(value)}>
            Save
          </Button>
          <Button
            onClick={() => {
              setApiBase('');
              setValue(defaultApiBase());
            }}
          >
            Use the default
          </Button>
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 12 }}>
          The address and its QR code are shown on the station under Mission settings. Phone and station must be on the same base Wi-Fi;
          no internet is used.
        </p>
      </Panel>
      <Panel title="About">
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          HESTIA is a student prototype for the NASA Space Apps Challenge 2026. The crew and all values are simulated, thresholds are
          indicative, and nothing here is a diagnosis or medical advice.
        </p>
      </Panel>
    </div>
  );
}
