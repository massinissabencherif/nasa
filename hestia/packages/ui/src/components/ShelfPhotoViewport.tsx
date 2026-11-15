import { useState, type ReactNode } from 'react';
import type { ShelfBoxes } from '@hestia/api-client';
import { t } from '../i18n';

/** Crop the displayed image to analysed boxes; coordinates keep their original meaning. */
export function ShelfPhotoViewport({
  imageUrl,
  boxes,
  alt,
  children,
  maxHeightVh = 42,
}: {
  imageUrl: string;
  boxes: ShelfBoxes;
  alt: string;
  maxHeightVh?: number;
  children?: (localBoxes: ShelfBoxes) => ReactNode;
}) {
  const [ratio, setRatio] = useState(4 / 3);
  const [failed, setFailed] = useState<string | null>(null);
  const entries = Object.entries(boxes);
  const left = entries.length ? Math.min(...entries.map(([, b]) => b[0])) : 0;
  const top = entries.length ? Math.min(...entries.map(([, b]) => b[1])) : 0;
  const width = entries.length ? Math.max(...entries.map(([, b]) => b[2])) - left : 1;
  const height = entries.length ? Math.max(...entries.map(([, b]) => b[3])) - top : 1;
  const aspect = (ratio * width) / height;
  const localBoxes: ShelfBoxes = Object.fromEntries(
    entries.map(([label, b]) => [
      label,
      [(b[0] - left) / width, (b[1] - top) / height, (b[2] - left) / width, (b[3] - top) / height],
    ]),
  );
  if (failed === imageUrl)
    return (
      <p>
        {t('Picture unavailable. Import a new photo.', 'Photo indisponible. Importez une nouvelle photo.')}
      </p>
    );
  return (
    <div
      className="hz-shelf-photo-viewport"
      style={{ aspectRatio: aspect, width: `min(100%, 440px, ${aspect * maxHeightVh}vh)` }}
    >
      <img
        src={imageUrl}
        alt={alt}
        onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
        onError={() => setFailed(imageUrl)}
        style={{
          width: `${100 / width}%`,
          height: `${100 / height}%`,
          left: `${(-left * 100) / width}%`,
          top: `${(-top * 100) / height}%`,
        }}
      />
      {children?.(localBoxes)}
    </div>
  );
}
