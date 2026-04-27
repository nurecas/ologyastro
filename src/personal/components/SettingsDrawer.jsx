// -----------------------------------------------------------------------------
// Phase 5 — Settings drawer
//
// Right-side slide-in panel housing every cross-cutting preference so no
// individual mode owns settings chrome. Triggered by the gear icon in
// ModeNav or by Cmd+,. Closes on click-outside, Esc, or its close button.
//
// Section 3.2 of the brief is the spec. Basic mode shows zodiac +
// house system; Advanced mode additionally shows ayanamsa picker, extra
// house systems, Uranian / fixed-stars toggles, chart-patterns on/off,
// planetary-hours strip toggle, JSON export, and the keyboard shortcut
// cheatsheet.
// -----------------------------------------------------------------------------

import React, { useEffect, useRef } from 'react';
import { usePersonal } from '../store.js';

const SHORTCUTS = [
  ['⌘1',        'Profile'],
  ['⌘2',        'Life'],
  ['⌘3',        'Transits'],
  ['⌘4',        'Map'],
  ['⌘5',        'Synastry'],
  ['⌘6',        'Predictive (Advanced)'],
  ['⌘,',        'Settings'],
  ['⌘⇧A',       'Toggle Basic/Advanced'],
  ['⌘⇧T',       'Test mode'],
  ['⌘D',        'Download chart'],
  ['Esc',       'Close drawer / popover'],
];

function Row({ label, children, sub }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="text-[13px] text-[#e6e6f0]">{label}</div>
        {sub && <div className="text-[10px] text-[#6d6d88] mt-0.5">{sub}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Pill({ active, children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
        active
          ? 'bg-[#f5d680]/10 border-[#f5d680]/50 text-[#f5d680]'
          : 'bg-transparent border-white/15 text-[#9b9bbd] hover:text-[#e6e6f0]'
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${on ? 'bg-[#f5d680]/80 justify-end' : 'bg-white/10 justify-start'}`}
      aria-pressed={on}
    >
      <span className="w-4 h-4 rounded-full bg-[#080810]" />
    </button>
  );
}

function exportChartJSON(natal, birth) {
  const payload = {
    version: 1,
    app: 'Ology',
    exportedAt: new Date().toISOString(),
    birth,
    computed: natal ? {
      jd: natal.jd,
      ascDeg: natal.ascDeg,
      mcDeg:  natal.mcDeg,
      houses: natal.houses,
      houseSystem: natal.houseSystem,
      planets: natal.planets.map(p => ({
        name: p.name, lonDeg: p.lonDeg, house: p.house, amplitude: p.amplitude, classical: p.classical, calculatedPoint: p.calculatedPoint,
      })),
      partOfFortuneDeg: natal.partOfFortuneDeg,
      isDay: natal.isDay,
    } : null,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(birth?.name || 'chart').replace(/\s+/g, '_')}.ology.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function SettingsDrawer() {
  const {
    settingsOpen, closeSettings,
    uiMode, toggleUIMode,
    zodiac, setZodiac, ayanamsa, setAyanamsa,
    houseSystem, setHouseSystem,
    includeUranian, setIncludeUranian,
    showFixedStars, setShowFixedStars,
    showChartPatterns, setShowChartPatterns,
    showPlanetaryHours, setShowPlanetaryHours,
    natal, birth,
  } = usePersonal();

  const panelRef = useRef(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) closeSettings();
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [settingsOpen, closeSettings]);

  if (!settingsOpen) return null;

  const advanced = uiMode === 'advanced';

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/40" />
      <aside
        ref={panelRef}
        className="absolute right-0 top-0 bottom-0 w-full sm:w-[360px] bg-[#0a0a14] border-l border-white/10 shadow-2xl overflow-y-auto"
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="font-serif tracking-[0.2em] text-[13px] text-[#f5d680]">SETTINGS</div>
          <button
            onClick={closeSettings}
            className="text-[#9b9bbd] hover:text-white text-lg leading-none"
            aria-label="Close settings"
          >×</button>
        </header>

        <section className="px-5 py-3 border-b border-white/5">
          <Row label="Interface" sub="Advanced reveals Predictive mode, dignities, midpoints, aspect grid, Uranian points, fixed stars, extra house systems, keyboard shortcuts.">
            <div className="flex gap-1">
              <Pill active={uiMode === 'basic'} onClick={() => uiMode === 'advanced' && toggleUIMode()}>Basic</Pill>
              <Pill active={advanced}           onClick={() => uiMode === 'basic' && toggleUIMode()}>Advanced</Pill>
            </div>
          </Row>
        </section>

        <section className="px-5 py-3 border-b border-white/5">
          <div className="text-[10px] tracking-[0.25em] uppercase text-[#6d6d88] mb-2">Zodiac</div>
          <Row label="Reference frame">
            <div className="flex gap-1">
              <Pill active={zodiac === 'tropical'} onClick={() => setZodiac('tropical')}>Tropical</Pill>
              <Pill active={zodiac === 'sidereal'} onClick={() => setZodiac('sidereal')}>Sidereal</Pill>
            </div>
          </Row>
          {zodiac === 'sidereal' && advanced && (
            <Row label="Ayanamsa">
              <div className="flex flex-wrap gap-1 justify-end max-w-[220px]">
                {['lahiri', 'kp', 'raman', 'truecitra', 'fagan_bradley'].map(a => (
                  <Pill key={a} active={ayanamsa === a} onClick={() => setAyanamsa(a)}>
                    {a === 'kp' ? 'KP' : a === 'fagan_bradley' ? 'Fagan/Bradley' : a === 'truecitra' ? 'True Citra' : a[0].toUpperCase() + a.slice(1)}
                  </Pill>
                ))}
              </div>
            </Row>
          )}
        </section>

        <section className="px-5 py-3 border-b border-white/5">
          <div className="text-[10px] tracking-[0.25em] uppercase text-[#6d6d88] mb-2">Houses</div>
          <Row label="House system">
            <div className="flex flex-wrap gap-1 justify-end max-w-[220px]">
              <Pill active={houseSystem === 'placidus'}    onClick={() => setHouseSystem('placidus')}>Placidus</Pill>
              <Pill active={houseSystem === 'whole-sign'}  onClick={() => setHouseSystem('whole-sign')}>Whole Sign</Pill>
              {advanced && <Pill active={houseSystem === 'koch'}   onClick={() => setHouseSystem('koch')}>Koch</Pill>}
              {advanced && <Pill active={houseSystem === 'equal'}  onClick={() => setHouseSystem('equal')}>Equal</Pill>}
            </div>
          </Row>
        </section>

        {advanced && (
          <section className="px-5 py-3 border-b border-white/5">
            <div className="text-[10px] tracking-[0.25em] uppercase text-[#6d6d88] mb-2">Advanced bodies & overlays</div>
            <Row label="Uranian points (Cupido…Poseidon)" sub="Hamburg-school hypothetical points">
              <Toggle on={includeUranian} onClick={() => setIncludeUranian(!includeUranian)} />
            </Row>
            <Row label="Fixed stars" sub="Brady's 30 notable stars on the outer rim">
              <Toggle on={showFixedStars} onClick={() => setShowFixedStars(!showFixedStars)} />
            </Row>
            <Row label="Chart-pattern detection" sub="Grand trines, T-squares, stelliums…">
              <Toggle on={showChartPatterns} onClick={() => setShowChartPatterns(!showChartPatterns)} />
            </Row>
            <Row label="Planetary-hours strip" sub="Top of Transits: ♂ hour · next ☿ at 14:27">
              <Toggle on={showPlanetaryHours} onClick={() => setShowPlanetaryHours(!showPlanetaryHours)} />
            </Row>
          </section>
        )}

        <section className="px-5 py-3 border-b border-white/5">
          <div className="text-[10px] tracking-[0.25em] uppercase text-[#6d6d88] mb-2">Data</div>
          <Row label="Export chart" sub="Download birth data + computed positions as JSON">
            <button
              onClick={() => exportChartJSON(natal, birth)}
              className="text-[11px] px-2.5 py-1 rounded border border-white/15 text-[#9b9bbd] hover:text-[#e6e6f0]"
            >JSON</button>
          </Row>
        </section>

        {advanced && (
          <section className="px-5 py-3">
            <div className="text-[10px] tracking-[0.25em] uppercase text-[#6d6d88] mb-2">Keyboard shortcuts</div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
              {SHORTCUTS.map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt className="text-[#f5d680] font-mono">{k}</dt>
                  <dd className="text-[#9b9bbd]">{v}</dd>
                </React.Fragment>
              ))}
            </dl>
          </section>
        )}
      </aside>
    </div>
  );
}
