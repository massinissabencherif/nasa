import { useState } from 'react';
import type { EarthMessage, EarthUpdatePreview, OnboardReading } from '@hestia/api-client';
import {
  Button,
  IconCheck,
  IconClock,
  IconCritical,
  StatusBadge,
  indicatorLabel,
  parseServerTime,
  t,
} from '@hestia/ui';
import { api } from '../../lib/api';

/* What the crew does while a report travels to Earth and back. */

const hhmm = (iso: string) =>
  new Date(parseServerTime(iso)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const caption = { fontSize: 'var(--text-xs)', color: 'var(--text-faint)' } as const;
const figure = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' } as const;
const sectionTitle = { fontSize: 'var(--text-sm)', fontWeight: 600 } as const;

const CHANGE: Record<OnboardReading['change'], () => string> = {
  better: () => t('better', 'mieux'),
  worse: () => t('worse', 'pire'),
  same: () => t('unchanged', 'inchangé'),
  unknown: () => t('no new reading', 'pas de nouvelle mesure'),
};

function minutesLeft(iso: string, now: number): number {
  return Math.ceil((parseServerTime(iso) - now) / 60000);
}

/** Banner when a demo rule says not to wait: always visible, never folded. */
export function DontWaitBanner({ msg }: { msg: EarthMessage }) {
  if (!msg.dont_wait?.triggered || msg.status === 'replied') return null;
  const reasons = msg.dont_wait.rules.filter((r) => r.triggered).map((r) => r.text);
  return (
    <div
      role="alert"
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 'var(--space-3)',
        alignItems: 'start',
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--red)',
        background: 'var(--red-dim)',
      }}
    >
      <IconCritical size={20} style={{ color: 'var(--red-ink)' }} />
      <div>
        <p style={{ fontWeight: 600, color: 'var(--red-ink)' }}>
          {t('Do not wait for Earth: apply the onboard procedure now.', 'N’attendez pas la Terre : appliquez la procédure de bord maintenant.')}
        </p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}>
          {t('Reason:', 'Raison :')} {reasons.map((r) => t(r)).join(' · ')}.{' '}
          <span style={caption}>{t('Demo rule chosen by the team, not a medical protocol.', 'Règle de démo choisie par l’équipe, pas un protocole médical.')}</span>
        </p>
      </div>
    </div>
  );
}

/** What Earth will read (frozen when sent) next to what is true on board now. */
export function TwoClocks({ msg, now }: { msg: EarthMessage; now: number }) {
  const sentAge = Math.max(0, Math.round((now - parseServerTime(msg.created_ts)) / 60000));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-4)' }}>
      <div style={{ display: 'grid', gap: 'var(--space-2)', alignContent: 'start' }}>
        <p style={sectionTitle}>{t('What Earth reads', 'Ce que la Terre lit')}</p>
        <p style={caption}>
          {t('Values sent at', 'Valeurs envoyées à')} <span style={figure}>{hhmm(msg.created_ts)}</span>
          {sentAge > 0 && ` · ${t('already', 'déjà')} ${sentAge} min`}
        </p>
        {msg.onboard_now.map((r) => (
          <div key={r.indicator} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
            <span style={{ color: 'var(--text-muted)' }}>{t(indicatorLabel(r.indicator))}</span>
            <span style={figure}>
              {r.sent_value ?? 'n/a'} {r.unit}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gap: 'var(--space-2)',
          alignContent: 'start',
          paddingLeft: 'var(--space-4)',
          borderLeft: '1px solid var(--border)',
        }}
      >
        <p style={sectionTitle}>{t('On board now', 'À bord maintenant')}</p>
        <p style={caption}>{t('Latest reading of each value', 'Dernière mesure de chaque valeur')}</p>
        {msg.onboard_now.map((r) => (
          <div
            key={r.indicator}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 'var(--space-2)', alignItems: 'center', fontSize: 'var(--text-sm)' }}
          >
            <span style={{ color: 'var(--text-muted)' }}>
              {t(indicatorLabel(r.indicator))}
              {r.measured_ts && <span style={caption}> · {hhmm(r.measured_ts)}</span>}
            </span>
            <span style={figure}>
              {r.value ?? 'n/a'} {r.unit}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ ...caption, color: r.change === 'worse' ? 'var(--red-ink)' : r.change === 'better' ? 'var(--green-ink)' : 'var(--text-faint)' }}>
                {r.change === 'better' ? '↓ ' : r.change === 'worse' ? '↑ ' : ''}
                {CHANGE[r.change]()}
              </span>
              {r.level && <StatusBadge level={r.level} size="sm" />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Steps ticked by a person while waiting; the time is recorded. */
export function OnboardPlan({ msg, now, onChange }: { msg: EarthMessage; now: number; onChange: () => void }) {
  const [busy, setBusy] = useState<number | null>(null);
  async function toggle(id: number, done: boolean) {
    setBusy(id);
    try {
      await api.tickOnboardStep(id, done);
      onChange();
    } finally {
      setBusy(null);
    }
  }
  const done = msg.plan.filter((s) => s.done_ts).length;
  return (
    <div style={{ display: 'grid', gap: 'var(--space-2)', alignContent: 'start' }}>
      <p style={sectionTitle}>
        {t('Onboard plan while waiting', 'Plan de bord pendant l’attente')}{' '}
        <span style={{ ...caption, ...figure }}>
          {done}/{msg.plan.length}
        </span>
      </p>
      <ul style={{ display: 'grid', gap: 'var(--space-1)', listStyle: 'none', padding: 0, margin: 0 }}>
        {msg.plan.map((step) => {
          const mins = step.due_ts ? minutesLeft(step.due_ts, now) : null;
          const later = mins != null && mins > 0;
          return (
            <li key={step.id}>
              <label
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                  gap: 'var(--space-2)',
                  alignItems: 'center',
                  minHeight: 36,
                  cursor: 'pointer',
                  fontSize: 'var(--text-sm)',
                  color: step.done_ts ? 'var(--text-muted)' : 'var(--text)',
                }}
              >
                <input
                  type="checkbox"
                  checked={step.done_ts != null}
                  disabled={busy === step.id}
                  onChange={(e) => void toggle(step.id, e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
                />
                <span style={{ textDecoration: step.done_ts ? 'line-through' : 'none' }}>{t(step.label)}</span>
                <span style={{ ...caption, ...figure, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {step.done_ts ? (
                    <>
                      <IconCheck size={12} /> {hhmm(step.done_ts)}
                    </>
                  ) : later ? (
                    <>
                      <IconClock size={12} /> {t('in', 'dans')} {mins} min
                    </>
                  ) : (
                    t('now', 'maintenant')
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The demo rules that say when to act without the reply. */
export function DontWaitRules({ msg }: { msg: EarthMessage }) {
  if (!msg.dont_wait) return null;
  return (
    <div style={{ display: 'grid', gap: 'var(--space-2)', alignContent: 'start' }}>
      <p style={sectionTitle}>{t('Act without waiting for Earth if…', 'Agir sans attendre la Terre si…')}</p>
      <ul style={{ display: 'grid', gap: 'var(--space-1)', listStyle: 'none', padding: 0, margin: 0 }}>
        {msg.dont_wait.rules.map((r) => (
          <li key={r.text} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)', alignItems: 'center', fontSize: 'var(--text-sm)', minHeight: 36 }}>
            <span>{t(r.text)}</span>
            {r.triggered ? (
              <StatusBadge level="red" size="sm" label={t('reached', 'atteint')} />
            ) : (
              <span style={caption}>{t('watching', 'surveillé')}</span>
            )}
          </li>
        ))}
      </ul>
      <p style={caption}>{t('Demo rules chosen by the team, not a medical protocol.', 'Règles de démo choisies par l’équipe, pas un protocole médical.')}</p>
    </div>
  );
}

/** Prepare an update, show its exact text, send only on confirmation. */
export function UpdateComposer({ msg, onSent }: { msg: EarthMessage; onSent: () => void }) {
  const [preview, setPreview] = useState<EarthUpdatePreview | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'sending' | 'error'>('idle');
  async function prepare() {
    setState('loading');
    try {
      setPreview(await api.previewEarthUpdate(msg.id));
      setState('idle');
    } catch {
      setState('error');
    }
  }
  async function send() {
    setState('sending');
    try {
      await api.sendEarthUpdate(msg.id);
      setPreview(null);
      setState('idle');
      onSent();
    } catch {
      setState('error');
    }
  }
  const changed = msg.onboard_now.some((r) => r.change === 'better' || r.change === 'worse');
  return (
    <div style={{ display: 'grid', gap: 'var(--space-2)', alignContent: 'start' }}>
      <p style={sectionTitle}>{t('Update Earth', 'Informer la Terre')}</p>
      {!preview ? (
        <>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {changed
              ? t('A value changed since the report left. Earth is reading old data.', 'Une valeur a changé depuis l’envoi. La Terre lit des données dépassées.')
              : t('Nothing new on board yet. Measure again, then update Earth.', 'Rien de nouveau à bord pour l’instant. Remesurez, puis informez la Terre.')}
          </p>
          <div>
            <Button variant={changed ? 'primary' : 'secondary'} onClick={() => void prepare()} disabled={state === 'loading'}>
              {t('Prepare an update', 'Préparer un complément')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p style={caption}>
            {t('Exact text sent,', 'Texte exact envoyé,')} {preview.summary.length} {t('characters · in English · same delay as the report', 'caractères · en anglais · même délai que le rapport')}
          </p>
          <p
            style={{
              fontSize: 'var(--text-sm)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--panel-raised)',
            }}
          >
            {preview.summary}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="primary" onClick={() => void send()} disabled={state === 'sending'}>
              {t('Send to Earth', 'Envoyer à la Terre')}
            </Button>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              {t('Cancel', 'Annuler')}
            </Button>
          </div>
        </>
      )}
      {state === 'error' && (
        <p role="alert" style={{ color: 'var(--red-ink)', fontSize: 'var(--text-sm)' }}>
          {t('The station did not answer. Nothing was sent.', 'La station n’a pas répondu. Rien n’a été envoyé.')}
        </p>
      )}
    </div>
  );
}
