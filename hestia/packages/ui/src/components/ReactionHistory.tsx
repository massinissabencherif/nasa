import { useEffect, useState } from 'react';
import type { ApiClient, ReactionSessionDetail, ReactionSessionSummary } from '@hestia/api-client';
import { Button } from './Button';
import { Panel } from './Panel';
import { ReactionSessionView } from './ReactionResult';

export function ReactionHistory({ api, crewId, deviceId }: { api: ApiClient; crewId: number; deviceId?: string }) {
  // Remount when identity changes so another crew member's results never flash on screen.
  return <History key={`${api.baseUrl}:${crewId}:${deviceId ?? 'all'}`} api={api} crewId={crewId} deviceId={deviceId} />;
}

function History({ api, crewId, deviceId }: { api: ApiClient; crewId: number; deviceId?: string }) {
  const [rows, setRows] = useState<ReactionSessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReactionSessionDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let sequence = 0;
    const load = async () => {
      const request = ++sequence;
      try {
        const value = await api.getReactionSessions(crewId, { device_id: deviceId, limit: 30 });
        if (active && request === sequence) { setRows(value); setError(null); }
      } catch {
        if (active && request === sequence) setError('Station unreachable. Displayed results may be out of date.');
      }
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [api, crewId, deviceId, retry]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    api.getReactionSession(crewId, selected).then((value) => { if (active) { setDetail(value); setDetailError(null); } })
      .catch(() => { if (active) setDetailError('Could not load this session. Retry when the station is available.'); });
    return () => { active = false; };
  }, [api, crewId, selected, retry]);

  const latest = rows?.find((row) => row.status === 'complete' && row.median_ms != null);
  const comparable = latest?.device_id ? rows!.filter((row) => row.status === 'complete' && row.median_ms != null
    && row.protocol_version === latest.protocol_version && row.device_id === latest.device_id && row.source === latest.source).reverse() : [];
  const minimum = Math.min(...comparable.map((row) => row.median_ms!));
  const maximum = Math.max(...comparable.map((row) => row.median_ms!));
  const points = comparable.map((row, index) => `${20 + index * 280 / Math.max(1, comparable.length - 1)},${110 - (row.median_ms! - minimum) / Math.max(1, maximum - minimum) * 90}`).join(' ');
  return (
    <Panel title="Reaction history">
      <div className="assessment-stack">
        <p className="assessment-muted">Latest 30 sessions{deviceId ? ' on this installation' : ', with each protocol and installation kept distinct'}. Incomplete sessions do not build a reference.</p>
        {error && <p role="alert">{error} <Button size="sm" onClick={() => setRetry((value) => value + 1)}>Retry</Button></p>}
        {rows == null && !error && <p role="status">Loading sessions…</p>}
        {rows?.length === 0 && <p>No recorded sessions{deviceId ? ' on this installation' : ''}. Missing results do not mean normal health.</p>}
        {comparable.length > 1 && <figure style={{ margin: 0 }}>
          <svg className="reaction-trend" viewBox="0 0 320 140" role="img" aria-label={`Median reaction times, ${comparable.length} comparable sessions, oldest to newest. Values are listed below.`}>
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" />
            <text x="20" y="135" fill="currentColor" fontSize="11">{Math.round(minimum)}–{Math.round(maximum)} ms · oldest → newest</text>
          </svg>
          <figcaption className="assessment-muted">Median trend for the latest complete session’s protocol, installation and source.</figcaption>
        </figure>}
        <ul className="reaction-history-list">
          {rows?.map((row) => <li key={row.id}>
            <button className="reaction-history-row" aria-expanded={selected === row.id} onClick={() => {
              setSelected(selected === row.id ? null : row.id); setDetail(null); setDetailError(null);
            }}>
              {new Date(row.started_at).toLocaleString('en-GB')} · {row.median_ms == null ? 'no valid response' : `${Math.round(row.median_ms)} ms median`}
              <small>{row.status} · {row.source === 'simulated' ? 'SIMULATED' : 'measured on device'} · {row.protocol_version} · installation {row.device_id?.slice(0, 8) ?? 'unknown'}</small>
            </button>
            {selected === row.id && <div className="assessment-notice">
              {detailError ? <p role="alert">{detailError} <Button onClick={() => setRetry((value) => value + 1)}>Retry</Button></p>
                : detail ? <ReactionSessionView result={detail} /> : <p role="status">Loading trials…</p>}
            </div>}
          </li>)}
        </ul>
      </div>
    </Panel>
  );
}
