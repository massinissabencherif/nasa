import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { t } from '../i18n';

/** User opens this view explicitly. Every exit, retry and device switch releases the camera. */
export function ShelfCamera({ onCapture }: { onCapture: (photo: Blob) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [device, setDevice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false;
    let stream: MediaStream | null = null;
    const stop = () => {
      stream?.getTracks().forEach((track) => track.stop());
      if (video.current?.srcObject === stream) video.current.srcObject = null;
    };
    const onHidden = () => {
      if (document.hidden) {
        disposed = true;
        stop();
        setReady(false);
        setError(
          t('Camera paused. Resume when ready.', 'Caméra en pause. Relancez-la quand vous êtes prêt.'),
        );
      }
    };
    async function open() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('secure-context');
        const media = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            ...(device ? { deviceId: { exact: device } } : { facingMode: { ideal: 'environment' } }),
            width: { ideal: 1600 },
            height: { ideal: 1200 },
          },
        });
        stream = media;
        if (disposed) {
          stop();
          return;
        }
        if (video.current) {
          video.current.srcObject = media;
          await video.current.play();
        }
        if (disposed) return;
        setReady(true);
        const available = await navigator.mediaDevices.enumerateDevices();
        if (!disposed) setDevices(available.filter((d) => d.kind === 'videoinput'));
      } catch (cause) {
        stop();
        if (disposed) return;
        setReady(false);
        setError(
          cause instanceof DOMException && cause.name === 'NotAllowedError'
            ? t(
                'Camera permission was refused. Allow it in the browser, or import a photo.',
                'Accès caméra refusé. Autorisez-le dans le navigateur, ou importez une photo.',
              )
            : t(
                'Camera unavailable. Open HESTIA on localhost or HTTPS, check camera access, or import a photo.',
                'Caméra indisponible. Ouvrez HESTIA sur localhost ou en HTTPS, vérifiez son accès, ou importez une photo.',
              ),
        );
      }
    }
    void open();
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      disposed = true;
      stop();
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [device, attempt]);
  async function capture() {
    const el = video.current;
    if (!ready || !el?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = el.videoWidth;
    canvas.height = el.videoHeight;
    canvas.getContext('2d')?.drawImage(el, 0, 0);
    const photo = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (photo) onCapture(photo);
  }
  return (
    <div className="hz-shelf-camera">
      <p>
        {t(
          'Face the shelf, keep every compartment in view, and hold still.',
          'Placez la caméra face à la réserve, avec toutes les cases visibles, puis restez immobile.',
        )}
      </p>
      <video ref={video} autoPlay muted playsInline aria-label={t('Camera preview', 'Aperçu de la caméra')} />
      {error && <p role="alert">{error}</p>}
      {!ready && !error && (
        <p role="status">
          <span className="hz-spinner" /> {t('Opening camera…', 'Ouverture de la caméra…')}
        </p>
      )}
      {devices.length > 1 && (
        <div className="hz-shelf-actions" role="group" aria-label={t('Camera', 'Caméra')}>
          {devices.map((d, i) => (
            <Button
              size="sm"
              key={d.deviceId}
              active={device === d.deviceId}
              onClick={() => {
                setReady(false);
                setError(null);
                setDevice(d.deviceId);
              }}
            >
              {d.label || `${t('Camera', 'Caméra')} ${i + 1}`}
            </Button>
          ))}
        </div>
      )}
      <Button variant="primary" disabled={!ready} onClick={() => void capture()}>
        {t('Take photo', 'Prendre la photo')}
      </Button>
      {error && (
        <Button
          onClick={() => {
            setReady(false);
            setError(null);
            setAttempt((a) => a + 1);
          }}
        >
          {t('Try camera again', 'Relancer la caméra')}
        </Button>
      )}
    </div>
  );
}
