// Ology — first-load welcome dialog.
// Shows on the user's FIRST visit to the site (any system entry). The
// dismissed flag is stored in a SHARED localStorage key so dismissing in
// one system carries across all the others.
//
// On narrow viewports (<= 820px wide), the dialog also notes that Ology
// is built for desktop / tablet-landscape — combining the previous
// "MobileNotice" component into one prompt.

import React, { useEffect, useState } from 'react';

const KEY = 'ology-beta-ack-v1';
const NARROW_BREAKPOINT_PX = 820;

function isAcknowledged() {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(KEY) === '1';
  } catch { return false; }
}
function acknowledge() {
  try { localStorage.setItem(KEY, '1'); } catch {}
}

export default function BetaDialog() {
  const [acked, setAcked] = useState(true);   // start hidden; flip after mount-check
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < NARROW_BREAKPOINT_PX
  );

  useEffect(() => {
    setAcked(isAcknowledged());
    const onResize = () => setNarrow(window.innerWidth < NARROW_BREAKPOINT_PX);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const dismiss = () => {
    acknowledge();
    setAcked(true);
  };

  if (acked) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
      <div
        role="dialog"
        aria-labelledby="beta-dialog-title"
        className="w-full max-w-[480px] bg-[#0c0c18] border border-[#f5d680]/30 rounded-lg shadow-2xl p-6 text-[#e6e6f0]"
      >
        <div
          id="beta-dialog-title"
          className="font-serif text-[20px] tracking-[0.18em] text-[#f5d680] mb-2"
        >
          Welcome to Ology
        </div>
        <div className="text-[10.5px] tracking-[0.3em] uppercase text-[#d79b3a] mb-4">
          Beta
        </div>

        <div className="text-[13px] text-[#c8c8dd] leading-relaxed space-y-3">
          <p>
            This is a beta version. Some features are still settling in and
            you may encounter occasional errors — flag anything that looks
            off and check back as the app matures.
          </p>
          <p>
            <span className="text-[#fff8dd] font-medium">Your data stays here.</span>{' '}
            Every chart is computed locally in your browser. Birth details,
            saved profiles, and every reading you generate are stored only
            in this device's local storage — they are never sent to any
            server.
          </p>
          <p>
            Only basic, anonymous analytics are recorded via Google
            Analytics: page views, session count, country, browser type,
            and approximate device class. No birth data, names, or chart
            content is ever collected.
          </p>
          {narrow && (
            <p className="border-t border-white/10 pt-3 text-[#d79b3a] italic font-serif">
              Ology is densest on a desktop or tablet in landscape mode. The
              mobile view will work, but some panels may shrink below their
              ideal density.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={dismiss}
            className="text-[12px] tracking-[0.18em] uppercase font-medium px-5 py-2 rounded bg-[#f5d680] text-[#0b0b15] hover:bg-[#fff3c0] transition-colors"
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}
