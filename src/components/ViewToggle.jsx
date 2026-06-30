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
    <div className="absolute top-16 left-3 flex flex-col gap-1">
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
