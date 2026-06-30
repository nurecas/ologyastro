import React, { useState } from 'react';
import { useStore } from '../store.js';

export default function LayerPanel() {
  const layers           = useStore(s => s.layers);
  const setLayerEnabled  = useStore(s => s.setLayerEnabled);
  const setLayerMix      = useStore(s => s.setLayerMix);
  const masterCoh        = useStore(s => s.masterCoherence);
  const toggleMasterCoh  = useStore(s => s.toggleMasterCoherence);
  const [open, setOpen]  = useState(true);

  return (
    <div
      className={`absolute top-16 right-3 bg-[#0b0b15]/85 backdrop-blur-md border border-white/5 rounded-md text-[#d8d8e8] transition-all duration-300`}
      style={{ width: open ? 260 : 40 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] tracking-[0.25em] uppercase text-[#9b9bbd] hover:text-white"
      >
        <span>{open ? 'Vector Layers' : '≡'}</span>
        {open && <span>{open ? '–' : '+'}</span>}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {layers.map(l => (
            <LayerRow
              key={l.id}
              layer={l}
              onToggle={() => setLayerEnabled(l.id, !l.enabled)}
              onMix={(m) => setLayerMix(l.id, m)}
            />
          ))}

          <div className="pt-2 mt-2 border-t border-white/5">
            <label className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase cursor-pointer select-none">
              <input
                type="checkbox"
                checked={masterCoh}
                onChange={toggleMasterCoh}
                className="accent-[#f5d680]"
              />
              <span className={masterCoh ? 'text-[#f5d680]' : 'text-[#9b9bbd]'}>
                Master Coherence
              </span>
            </label>
            <div className="text-[9px] text-[#6d6d88] mt-1 leading-snug">
              Modulates layer visibility by global coherence amplitude.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LayerRow({ layer, onToggle, onMix }) {
  const { name, color, enabled, mix } = layer;
  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 text-left group"
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0 transition-all"
          style={{
            background: color,
            boxShadow: enabled ? `0 0 10px ${color}` : `0 0 0px ${color}00`,
            opacity: enabled ? 1 : 0.35,
          }}
        />
        <span
          className="text-[11px] leading-tight"
          style={{ color: enabled ? color : '#a2a2bd' }}
        >
          {name}
        </span>
      </button>
      {enabled && (
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={mix}
          onChange={(e) => onMix(parseFloat(e.target.value))}
          className="w-full spine-scrub"
          style={{ accentColor: color }}
        />
      )}
    </div>
  );
}
