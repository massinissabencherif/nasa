import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '@hestia/ui';
import { getApiBase, setApiBase } from '../lib/apiBase';
import { useConnection } from '../lib/hooks';

export function Settings() {
  const navigate = useNavigate();
  const [value, setValue] = useState(getApiBase());
  const connected = useConnection();

  function save() {
    setApiBase(value);
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 'var(--text-sm)', padding: 0, alignSelf: 'start' }}
      >
        Back
      </button>
      <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Settings</h1>
      <Panel title="Station connection">
        <p style={{ fontSize: 'var(--text-sm)', color: connected ? 'var(--green)' : 'var(--red)', marginBottom: 10 }}>
          {connected ? 'Connected' : 'Not reachable'}
        </p>
        <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-sm)' }}>
          Station address
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="http://192.168.1.x:8000"
            style={{
              background: 'var(--panel-raised)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-sm)',
            }}
          />
        </label>
        <button
          onClick={save}
          style={{
            marginTop: 12,
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'var(--accent)',
            color: '#07222c',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Save
        </button>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 10 }}>
          Find the station's address on its Mission settings screen.
        </p>
      </Panel>
    </div>
  );
}
