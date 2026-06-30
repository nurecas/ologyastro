// Ology — shared saved-profiles dropdown.
// Renders next to the name input on every BirthForm. Wraps the saved-list
// chrome (Saved · N button, dropdown with profile rows, edit/delete icons,
// clear-all). System-specific behaviour comes through props:
//
//   profiles      — array of saved profile objects (must have at least
//                   { name, year, month, day, hour, minute, latDeg, lonDeg })
//   profileKey    — fn(profile) → unique key string
//   onSelect      — fn(profile) — apply this profile as the active birth + enter
//   onLoad        — fn(profile) — load this profile into the form (don't enter)
//   onForget      — fn(key) — remove a single profile
//   onClearAll    — fn() — wipe all
//   profilesOpen, setProfilesOpen — controlled visibility of the dropdown.
//
// The button is positioned absolute-right inside the parent input wrapper;
// callers should set padding-right on the input to make room when profiles
// exist.

import React, { useEffect, useRef } from 'react';

export default function ProfilesDropdown({
  profiles, profileKey, onSelect, onLoad, onForget, onClearAll,
  profilesOpen, setProfilesOpen,
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (!profilesOpen) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setProfilesOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profilesOpen, setProfilesOpen]);

  if (!profiles || profiles.length === 0) return null;

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={() => setProfilesOpen(v => !v)}
        className="absolute right-1 top-1/2 -translate-y-1/2 btn-ghost flex items-center gap-1"
        style={{ padding: '4px 8px' }}
      >
        <span>Saved · {profiles.length}</span>
        <span style={{ transform: profilesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>▾</span>
      </button>
      {profilesOpen && (
        <div className="absolute z-20 top-full right-0 mt-1 bg-[#0b0b15] border border-white/10 rounded-md shadow-xl w-[340px] max-h-[320px] overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 sticky top-0 bg-[#0b0b15]">
            <div className="text-[10px] tracking-[0.25em] uppercase text-[#9b9bbd]">
              Saved charts · {profiles.length}
            </div>
            <button
              type="button"
              onClick={() => { onClearAll(); setProfilesOpen(false); }}
              className="text-[9.5px] tracking-[0.22em] uppercase text-[#6d6d88] hover:text-white"
            >
              clear all
            </button>
          </div>
          {profiles.map(p => {
            const key = profileKey(p);
            return (
              <div key={key} className="group flex items-center hover:bg-white/5 border-b border-white/5 last:border-b-0">
                <button
                  type="button"
                  onClick={() => { onSelect(p); setProfilesOpen(false); }}
                  className="flex-1 text-left px-3 py-2 min-w-0"
                >
                  <div className="text-[#e6e6f0] text-[12.5px] truncate">{p.name || 'Untitled'}</div>
                  <div className="text-[#9b9bbd] text-[10.5px] truncate">
                    {p.day}/{p.month}/{p.year} · {String(p.hour).padStart(2,'0')}:{String(p.minute).padStart(2,'0')} ·{' '}
                    {Math.abs(p.latDeg).toFixed(1)}°{p.latDeg >= 0 ? 'N' : 'S'} ·{' '}
                    {Math.abs(p.lonDeg).toFixed(1)}°{p.lonDeg >= 0 ? 'E' : 'W'}
                  </div>
                </button>
                <div className="flex gap-0.5 pr-2 shrink-0">
                  {onLoad && (
                    <button
                      type="button"
                      onClick={() => { onLoad(p); setProfilesOpen(false); }}
                      className="text-[#6d6d88] hover:text-white opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[12px]"
                      title="Load into form (don't enter)"
                    >✎</button>
                  )}
                  <button
                    type="button"
                    onClick={() => onForget(key)}
                    className="text-[#6d6d88] hover:text-[#ff6a6a] opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[14px] leading-none"
                    title="Forget"
                  >×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
