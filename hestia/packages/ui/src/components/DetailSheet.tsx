import { t } from '../i18n';
import { useLayoutEffect, useEffect, useState, useId, useRef, type ReactNode } from 'react';
import { frameSheetContext } from '../sheetContext';

/** Native modal behaviour, styled as a bottom sheet on a phone and a side
 * sheet on the station. Mount only while open. The page stays in place. */
export function DetailSheet({
  title,
  children,
  onClose,
  getContextAnchor,
  variant = 'sheet',
  dismissible = true,
}: {
  title: string;
  variant?: 'sheet' | 'modal';
  dismissible?: boolean;
  children: ReactNode;
  onClose: () => void;
  /** Keep the selected body zone in the visible strip above a mobile sheet. */
  getContextAnchor?: () => Element | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [closing, setClosing] = useState(false);
  const closeRequested = useRef(false);
  function requestClose() {
    if (!dismissible || closeRequested.current) return;
    closeRequested.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) onClose();
    else setClosing(true);
  }
  useEffect(() => {
    if (!closing) return;
    // Fallback if the animation is cancelled or the tab is hidden.
    const duration = parseFloat(getComputedStyle(dialog.current!).animationDuration) * 1000;
    const timer = window.setTimeout(onClose, (Number.isFinite(duration) ? duration : 0) + 80);
    return () => window.clearTimeout(timer);
  }, [closing, onClose]);
  const backdropStart = useRef(false);
  useLayoutEffect(() => {
    const element = dialog.current!;
    const trigger = document.activeElement as HTMLElement | null;
    element.showModal();
    const restoreContext = frameSheetContext(element, getContextAnchor?.() ?? null);
    return () => {
      element.close();
      restoreContext?.();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [getContextAnchor]);
  return (
    <dialog
      ref={dialog}
      className={`hz-sheet${variant === 'modal' ? ' hz-modal' : ''}${getContextAnchor ? ' hz-sheet-context' : ''}`}
      aria-labelledby={titleId}
      data-closing={closing || undefined}
      onAnimationEnd={(event) => {
        if (closing && event.target === event.currentTarget) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        requestClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        event.stopPropagation();
        const controls = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]',
          ),
        ].filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onPointerDown={(event) => {
        backdropStart.current = event.target === event.currentTarget;
      }}
      onPointerUp={(event) => {
        if (backdropStart.current && event.target === event.currentTarget) requestClose();
        backdropStart.current = false;
      }}
    >
      <header className="hz-sheet-header">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="hz-icon-button"
          aria-label={t('Close details')}
          onClick={requestClose}
          disabled={!dismissible}
        >
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <path
              d="m5 5 10 10M15 5 5 15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>
      <div className="hz-sheet-content">{children}</div>
    </dialog>
  );
}
