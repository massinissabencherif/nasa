/** Layout measurements on open/resize only; native scrolling does the animation.
 * Short/landscape viewports prioritise the sheet's readable content. */
export function frameSheetContext(sheet: HTMLDialogElement, anchor: Element | null) {
  if (!anchor || !window.matchMedia('(max-width: 767px) and (min-height: 600px)').matches) return;
  const scroller = anchor.closest('main');
  if (!scroller) return;
  const previousTop = scroller.scrollTop;
  const frame = () => {
    const top = scroller.getBoundingClientRect().top;
    sheet.style.setProperty('--sheet-context-top', `${top}px`);
    // offsetHeight ignores the entry animation's temporary translation.
    const bottom = window.innerHeight - sheet.offsetHeight;
    const bounds = anchor.getBoundingClientRect();
    const centre = (bounds.top + bounds.bottom) / 2;
    const visibleHeight = bottom - top;
    const halfCue = Math.min(bounds.height / 2, visibleHeight / 3);
    if (centre - halfCue < top || centre + halfCue > bottom) {
      scroller.scrollTo({
        top: scroller.scrollTop + centre - (top + bottom) / 2,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    }
  };
  frame();
  const observer = new ResizeObserver(frame);
  observer.observe(sheet);
  return () => {
    observer.disconnect();
    scroller.scrollTo({ top: previousTop, behavior: 'instant' });
  };
}
