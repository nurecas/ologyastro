// Keeps the active pill of a sideways-scrolling tab row inside the visible
// part of the row. On phones a row can hold more tabs than fit, so a mode
// restored from the last visit (or picked with a keyboard shortcut) could be
// active but scrolled out of sight. Only the row's own scrollLeft changes —
// the page itself never moves. When the row does not scroll, which is every
// desktop layout, nothing happens.

import { useLayoutEffect, useRef } from 'react';

const MARGIN = 12;

export default function useActiveTabInView(ref, activeKey) {
  const last = useRef({ row: null, key: undefined });
  // Runs after every render but only acts when the row has just appeared
  // (it can mount later than this hook, e.g. after the birth form) or the
  // active tab changed — never while the user is scrolling the row by hand.
  useLayoutEffect(() => {
    const row = ref.current;
    if (last.current.row === row && last.current.key === activeKey) return;
    last.current = { row, key: activeKey };
    if (!row || row.scrollWidth <= row.clientWidth + 1) return;
    const tab = row.querySelector('.active');
    if (!tab) return;
    const r = row.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    if (t.left < r.left + MARGIN) row.scrollLeft -= (r.left + MARGIN) - t.left;
    else if (t.right > r.right - MARGIN) row.scrollLeft += t.right - (r.right - MARGIN);
  });
}
