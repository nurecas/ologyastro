import React, { useEffect, useRef } from 'react';
import { useStore } from '../store.js';

const SPEEDS = [
  { label: '1 yr/s',   value: 1 },
  { label: '10 yr/s',  value: 10 },
  { label: '100 yr/s', value: 100 },
];

export default function Scrubber() {
  const playing  = useStore(s => s.playing);
  const toggle   = useStore(s => s.togglePlay);
  const speed    = useStore(s => s.speed);
  const setSpeed = useStore(s => s.setSpeed);
  const t        = useStore(s => s.t);
  const setT     = useStore(s => s.setT);
  const startYear = useStore(s => s.startYear);
  const endYear   = useStore(s => s.endYear);

  // rAF loop for playback.
  const rafRef = useRef(0);
  const lastRef = useRef(performance.now());

  useEffect(() => {
    const tick = (now) => {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      if (playing) {
        const span = endYear - startYear;
        const dYear = speed * dt;
        const state = useStore.getState();
        let next = state.t + dYear / span;
        if (next >= 1) { next = 1; useStore.setState({ playing: false }); }
        useStore.setState({ t: next });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speed, startYear, endYear]);

  return (
    <div className="flex items-center gap-3 text-[11px] tracking-widest uppercase text-[#cfcfe0]/80">
      <button
        onClick={toggle}
        className="btn-ghost"
        style={{ minWidth: 44 }}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="flex gap-1">
        {SPEEDS.map(s => (
          <button
            key={s.value}
            onClick={() => setSpeed(s.value)}
            className={`btn-ghost ${speed === s.value ? 'active' : ''}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <button
        onClick={() => setT(0)}
        className="btn-ghost"
      >
        ⇤ {startYear}
      </button>
      <button
        onClick={() => setT(1)}
        className="btn-ghost"
      >
        {endYear} ⇥
      </button>
    </div>
  );
}
