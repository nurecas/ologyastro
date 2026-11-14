// Keeps an absolutely-positioned popover (dropdown menu, focus box, saved
// profiles list) inside the viewport on narrow screens. After the popover
// renders we measure it and, only if it spills past either edge, nudge it
// horizontally with a translateX and cap its width to the viewport. When it
// already fits — every desktop layout — nothing is touched.

import { useLayoutEffect } from 'react';

const GUTTER = 8;

export default function useViewportClamp(ref, open) {
  useLayoutEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      el.style.transform = '';
      el.style.maxWidth = '';
      const vw = document.documentElement.clientWidth || window.innerWidth;
      let r = el.getBoundingClientRect();
      if (r.width > vw - GUTTER * 2) {
        el.style.maxWidth = `${vw - GUTTER * 2}px`;
        r = el.getBoundingClientRect();
      }
      let dx = 0;
      if (r.left < GUTTER) dx = GUTTER - r.left;
      else if (r.right > vw - GUTTER) dx = (vw - GUTTER) - r.right;
      if (dx) el.style.transform = `translateX(${Math.round(dx)}px)`;
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [ref, open]);
}
