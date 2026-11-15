import { Input } from '@hestia/ui';
import { t } from '@hestia/ui';
import { useState } from 'react';
import { Button, Panel, StatusBadge } from '@hestia/ui';
import { defaultApiBase, getApiBase, setApiBase } from '../lib/apiBase';
import { useConnection } from '../lib/hooks';

export function Settings() {
  const [value, setValue] = useState(getApiBase());
  const connected = useConnection();

  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }}>
      <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{t('Settings')}</h1>
      <Panel title={t('Station connection')}>
        <div style={{ marginBottom: 12 }}>
          {connected == null ? (
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-faint)' }}>{t('Checking…')}</span>
          ) : (
            <StatusBadge
              level={connected ? 'green' : 'red'}
              label={connected ? 'Station reachable' : 'Station not reachable'}
            />
          )}
        </div>
        <label style={{ display: 'grid', gap: 6, fontSize: 'var(--text-sm)' }}>
          {t('Station address')}
          <Input
            className="hz-control-mono"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="http://192.168.1.20:8000"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </label>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button variant="primary" onClick={() => setApiBase(value)}>
            {t('Save')}
          </Button>
          <Button
            onClick={() => {
              setApiBase('');
              setValue(defaultApiBase());
            }}
          >
            {t('Use the default')}
          </Button>
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginTop: 12 }}>
          {t(
            'The address and its QR code are shown on the station under Mission settings. Phone and station must be on the same base Wi-Fi; no internet is used.',
          )}
        </p>
      </Panel>
      <Panel title={t('About')}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          {t(
            'HESTIA is a student prototype for the NASA Space Apps Challenge 2026. The crew and all values are simulated, thresholds are indicative, and nothing here is a diagnosis or medical advice.',
          )}
        </p>
      </Panel>
    </div>
  );
}
