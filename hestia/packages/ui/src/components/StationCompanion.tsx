import { useRef, useState } from 'react';
import { Button } from './Button';
import { t } from '../i18n';
import { useVisibleMotion } from '../useVisibleMotion';

const image = new URL('../assets/hestia-companion-v1.png', import.meta.url).href;

export function CompanionPortrait() {
  return <img className="hz-companion-portrait" src={image} width="40" height="40" alt="" />;
}

/** Decorative guide; image provenance is recorded once in project credits. */
export function StationCompanion({ animated = false }: { animated?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const moving = useVisibleMotion(ref, animated && !paused);
  return (
    <div className="hz-companion-wrap">
      <div
        ref={ref}
        className="hz-companion"
        data-animated={animated || undefined}
        data-motion={moving ? 'running' : 'paused'}
      >
        <img src={image} width="96" height="96" alt="" />
      </div>
      {animated && (
        <Button
          className="hz-companion-pause"
          variant="ghost"
          size="sm"
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          {paused ? t('Resume animation', 'Animer') : t('Pause animation', 'Mettre en pause')}
        </Button>
      )}
    </div>
  );
}
