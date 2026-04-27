// Phase 6 (scoped): Ology is a dense, interactive astrological workbench
// built for desktop or landscape iPad. Rather than reflow every mode for
// ≤ 768 px, we show a single dismissible notice on narrow screens. Users
// who prefer to continue on a phone can do so — the app will still load,
// just with some panels shrunk below their ideal density.
//
// Persisted via the hintsDismissed map so we don't nag on every visit.

import React, { useEffect, useState } from 'react';
import { usePersonal } from '../store.js';

const HINT_ID = 'mobileNotice';
const BREAKPOINT_PX = 820;

export default function MobileNotice() {
  const dismissed   = usePersonal(s => s.hintsDismissed);
  const dismissHint = usePersonal(s => s.dismissHint);

  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < BREAKPOINT_PX
  );
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < BREAKPOINT_PX);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  if (!narrow)                 return null;
  if (dismissed?.[HINT_ID])    return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60">
      <div
        role="dialog"
        aria-labelledby="mobile-notice-title"
        className="w-full max-w-[420px] bg-[#0c0c18] border border-[#f5d680]/25 rounded-lg shadow-2xl p-5 text-[#e6e6f0]"
      >
        <div
          id="mobile-notice-title"
          className="font-serif text-[18px] tracking-wider text-[#f5d680] mb-2"
        >
          Best on a bigger screen
        </div>
        <p className="text-[13px] text-[#c8c8dd] leading-relaxed mb-4">
          Ology is built for desktop or tablets in landscape mode.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => dismissHint(HINT_ID, true)}
            className="text-[12px] px-4 py-2 rounded border border-[#f5d680]/40 text-[#f5d680] hover:bg-[#f5d680]/10"
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}
