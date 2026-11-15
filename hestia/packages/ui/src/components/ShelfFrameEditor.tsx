import { useRef, type PointerEvent } from 'react';
import type { ShelfFrame } from '@hestia/api-client';
import { moveShelfFrame, resizeShelfFrame, type FrameHandle } from '../shelfFrame';
import { Button } from './Button';
import { t } from '../i18n';

const handles: FrameHandle[] = ['tl', 'tr', 'bl', 'br', 't', 'r', 'b', 'l'];
export function ShelfFrameEditor({
  imageUrl,
  value,
  onChange,
}: {
  imageUrl: string;
  value: ShelfFrame;
  onChange: (frame: ShelfFrame) => void;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; frame: ShelfFrame } | null>(null);
  const rows = value.rows ?? 3,
    columns = value.columns ?? 4;
  function dragCorner(e: PointerEvent<HTMLButtonElement>, corner: FrameHandle) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const rect = surface.current?.getBoundingClientRect();
    if (rect)
      onChange(
        resizeShelfFrame(
          value,
          corner,
          (e.clientX - rect.left) / rect.width,
          (e.clientY - rect.top) / rect.height,
        ),
      );
  }
  return (
    <div className="hz-shelf-frame-editor">
      <div
        className="hz-shelf-dimensions"
        role="group"
        aria-label={t('Grid dimensions', 'Dimensions de la grille')}
      >
        {(
          [
            { key: 'rows', label: t('Rows', 'Rangées'), count: rows, max: 3 },
            { key: 'columns', label: t('Columns', 'Colonnes'), count: columns, max: 4 },
          ] as const
        ).map(({ key, label, count, max }) => (
          <div key={key}>
            <span>{label}</span>
            <div>
              <Button
                size="sm"
                aria-label={`${label} −`}
                disabled={count <= 1}
                onClick={() => onChange({ ...value, [key]: count - 1 })}
              >
                −
              </Button>
              <output>{count}</output>
              <Button
                size="sm"
                aria-label={`${label} +`}
                disabled={count >= max}
                onClick={() => onChange({ ...value, [key]: count + 1 })}
              >
                +
              </Button>
            </div>
          </div>
        ))}
      </div>
      <p>
        {t(
          'Drag inside to move. Drag an edge or corner to crop. Arrow keys also work.',
          'Glissez à l’intérieur pour déplacer. Tirez un côté ou un coin pour recadrer. Les flèches du clavier fonctionnent aussi.',
        )}
      </p>
      <div ref={surface} className="hz-shelf-frame">
        <img src={imageUrl} alt={t('Photo to frame', 'Photo à cadrer')} draggable={false} />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path
            d={`M0 0H100V100H0Z M${value.left * 100} ${value.top * 100}V${value.bottom * 100}H${value.right * 100}V${value.top * 100}Z`}
            fillRule="evenodd"
            className="hz-shelf-mask"
          />
          {Array.from({ length: rows * columns }, (_, i) => {
            const w = ((value.right - value.left) * 100) / columns,
              h = ((value.bottom - value.top) * 100) / rows;
            const x = value.left * 100 + (i % columns) * w,
              y = value.top * 100 + Math.floor(i / columns) * h;
            return (
              <g key={i}>
                <rect x={x} y={y} width={w} height={h} />
              </g>
            );
          })}
        </svg>
        <button
          type="button"
          className="hz-shelf-move"
          aria-label={t('Move entire grid', 'Déplacer toute la grille')}
          style={{
            left: `calc(${value.left * 100}% + 22px)`,
            top: `calc(${value.top * 100}% + 22px)`,
            width: `max(0px, calc(${(value.right - value.left) * 100}% - 44px))`,
            height: `max(0px, calc(${(value.bottom - value.top) * 100}% - 44px))`,
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.focus();
            dragStart.current = { x: e.clientX, y: e.clientY, frame: value };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const start = dragStart.current,
              rect = surface.current?.getBoundingClientRect();
            if (start && rect && e.currentTarget.hasPointerCapture(e.pointerId))
              onChange(
                moveShelfFrame(
                  start.frame,
                  (e.clientX - start.x) / rect.width,
                  (e.clientY - start.y) / rect.height,
                ),
              );
          }}
          onPointerUp={(e) => {
            dragStart.current = null;
            e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onKeyDown={(e) => {
            if (!e.key.startsWith('Arrow')) return;
            e.preventDefault();
            const step = e.shiftKey ? 0.05 : 0.01;
            onChange(
              moveShelfFrame(
                value,
                e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0,
                e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0,
              ),
            );
          }}
        ></button>
        {Array.from({ length: rows * columns }, (_, i) => (
          <span
            key={i}
            className="hz-shelf-grid-label"
            aria-hidden="true"
            style={{
              left: `${(value.left + (((i % columns) + 0.5) * (value.right - value.left)) / columns) * 100}%`,
              top: `calc(${(value.top + (Math.floor(i / columns) * (value.bottom - value.top)) / rows) * 100}% + 16px)`,
            }}
          >
            {'ABC'[Math.floor(i / columns)]}
            {(i % columns) + 1}
          </span>
        ))}
        {handles.map((corner, i) => {
          const x = corner.endsWith('l')
              ? value.left
              : corner.endsWith('r')
                ? value.right
                : (value.left + value.right) / 2,
            y = corner.startsWith('t')
              ? value.top
              : corner.startsWith('b')
                ? value.bottom
                : (value.top + value.bottom) / 2;
          const edge = corner.length === 1;
          const horizontal = corner === 't' || corner === 'b';
          const labels = [
            t('Top left', 'Haut gauche'),
            t('Top right', 'Haut droite'),
            t('Bottom left', 'Bas gauche'),
            t('Bottom right', 'Bas droite'),
            t('Top edge', 'Bord supérieur'),
            t('Right edge', 'Bord droit'),
            t('Bottom edge', 'Bord inférieur'),
            t('Left edge', 'Bord gauche'),
          ];
          return (
            <button
              type="button"
              key={corner}
              className={`hz-shelf-handle${edge ? ` hz-shelf-edge hz-shelf-edge-${horizontal ? 'horizontal' : 'vertical'}` : ''}`}
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                ...(edge
                  ? horizontal
                    ? { width: `max(44px, calc(${(value.right - value.left) * 100}% - 44px))` }
                    : { height: `max(44px, calc(${(value.bottom - value.top) * 100}% - 44px))` }
                  : {}),
                cursor: edge
                  ? horizontal
                    ? 'ns-resize'
                    : 'ew-resize'
                  : corner === 'tl' || corner === 'br'
                    ? 'nwse-resize'
                    : 'nesw-resize',
                zIndex: edge ? 2 : 4,
              }}
              aria-label={labels[i]}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.focus();
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => dragCorner(e, corner)}
              onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
              onKeyDown={(e) => {
                if (!e.key.startsWith('Arrow')) return;
                e.preventDefault();
                const step = e.shiftKey ? 0.05 : 0.01;
                onChange(
                  resizeShelfFrame(
                    value,
                    corner,
                    x + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0),
                    y + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0),
                  ),
                );
              }}
            >
              <span aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <p className="hz-caption">
        {t(
          'Up to 3 × 4 known slots. Only photographed slots are updated; other stock stays unchanged.',
          'Jusqu’à 3 × 4 cases connues. Seules les cases photographiées seront mises à jour ; le reste du stock est conservé.',
        )}
      </p>
    </div>
  );
}
