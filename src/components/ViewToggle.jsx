import React from 'react';
import { useStore } from '../store.js';

const VIEWS = [
  { id: 'field', label: 'Field' },
  { id: 'wheel', label: 'Wheel' },
  { id: 'globe', label: 'Globe' },
];

export default function ViewToggle() {
  const view = useStore(s => s.view);
  const setView = useStore(s => s.setView);
  return (
    // Below lg the toggle moves to a row above the bottom planet strip so it
    // does not sit on the HUD title block (which wraps on narrow screens).
    <div className="absolute bottom-16 left-3 flex flex-row lg:bottom-auto lg:top-16 lg:flex-col gap-1">
      {VIEWS.map(v => (
        <button
          key={v.id}
          onClick={() => setView(v.id)}
          className={`btn-ghost ${view === v.id ? 'active' : ''}`}
          style={{ minWidth: 70 }}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
