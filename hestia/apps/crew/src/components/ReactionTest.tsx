import { useEffect, useRef, useState } from 'react';
import { Button } from '@hestia/ui';
import { ANTICIPATION_MS, nextWaitMs, summarise, TRIALS, type ReactionSummary } from '../lib/reactionTest';

type Phase = 'intro' | 'wait' | 'go' | 'early' | 'done';

const PAD_TEXT: Record<Exclude<Phase, 'intro' | 'done'>, { title: string; hint: string }> = {
  wait: { title: 'Wait', hint: 'Tap as soon as this turns blue' },
  go: { title: 'Tap', hint: '' },
  early: { title: 'Too early', hint: 'Wait for the blue signal' },
};

/**
 * Short reaction-time self-test, inspired by NASA's Reaction Self-Test (a
 * 3-minute psychomotor vigilance test used on the ISS). This shortened
 * version is a screening aid, not a validated test.
 */
export function ReactionTest({ onDone, onCancel }: { onDone: (medianMs: number) => void; onCancel: () => void }) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [times, setTimes] = useState<number[]>([]);
  const [falseStarts, setFalseStarts] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const signalAt = useRef(0);

  // the only effect: never leave a timer running after the screen closes
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function armSignal() {
    setPhase('wait');
    timer.current = window.setTimeout(() => {
      signalAt.current = performance.now();
      setPhase('go');
    }, nextWaitMs());
  }

  function start() {
    setTimes([]);
    setFalseStarts(0);
    armSignal();
  }

  function tap() {
    if (phase === 'wait') {
      window.clearTimeout(timer.current);
      setFalseStarts((n) => n + 1);
      setPhase('early');
      timer.current = window.setTimeout(armSignal, 900);
      return;
    }
    if (phase !== 'go') return;
    const reaction = performance.now() - signalAt.current;
    if (reaction < ANTICIPATION_MS) {
      setFalseStarts((n) => n + 1);
      armSignal();
      return;
    }
    const next = [...times, reaction];
    setTimes(next);
    if (next.length >= TRIALS) setPhase('done');
    else armSignal();
  }

  if (phase === 'intro') {
    return (
      <div style={{ padding: 16, display: 'grid', gap: 14 }}>
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Reaction test</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          {TRIALS} signals, about 20 seconds. Hold the phone as you usually do. When the panel turns blue, tap it as fast as you
          can. The result is compared with your own earlier tests, not with other people.
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
          Inspired by the Reaction Self-Test used on the ISS (3 minutes). This short version is a screening aid, not a validated
          test.
        </p>
        <Button variant="primary" size="lg" onClick={start}>
          Start
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Back to the check-in
        </Button>
      </div>
    );
  }

  if (phase === 'done') {
    const summary: ReactionSummary = summarise(times, falseStarts);
    return (
      <div style={{ padding: 16, display: 'grid', gap: 14 }}>
        <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Reaction test done</h1>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-display)', lineHeight: 1 }}>
            {summary.medianMs}
            <span style={{ fontSize: 'var(--text-lg)', color: 'var(--text-muted)' }}> ms</span>
          </p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 8 }}>
            Median of {TRIALS} taps, from {summary.fastestMs} to {summary.slowestMs} ms.
            {summary.falseStarts > 0 && ` ${summary.falseStarts} tap${summary.falseStarts > 1 ? 's' : ''} before the signal, not counted.`}
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={() => onDone(summary.medianMs)}>
          Add to my check-in
        </Button>
        <Button variant="ghost" onClick={start}>
          Do it again
        </Button>
      </div>
    );
  }

  const text = PAD_TEXT[phase];
  const go = phase === 'go';
  return (
    <div style={{ padding: 16, display: 'grid', gap: 12, gridTemplateRows: 'auto 1fr', minHeight: 'calc(100dvh - 180px)' }}>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        {Math.min(times.length + 1, TRIALS)} / {TRIALS}
      </p>
      <button
        onPointerDown={tap}
        aria-label={go ? 'Tap now' : text.title}
        style={{
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          border: `1px solid ${go ? 'var(--accent)' : phase === 'early' ? 'var(--orange)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          background: go ? 'var(--accent)' : 'var(--panel)',
          color: go ? '#07222c' : phase === 'early' ? 'var(--orange)' : 'var(--text-muted)',
          display: 'grid',
          placeContent: 'center',
          gap: 8,
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 600 }}>{text.title}</span>
        {text.hint && <span style={{ fontSize: 'var(--text-sm)' }}>{text.hint}</span>}
      </button>
    </div>
  );
}
