// Vedic — settings drawer. Ayanamsa picker + chart format + interface mode.
// Mounts system-specific options into the shared SettingsShell.

import React from 'react';
import { useVedic } from '../store.js';
import SettingsShell, { SettingsRow, SettingsPill } from '../../shared/shell/SettingsShell.jsx';

const SHORTCUTS = [
  ['⌘1', 'Rashi'],
  ['⌘2', 'Nakshatras'],
  ['⌘3', 'Vargas (D-1…D-60)'],
  ['⌘4', 'Strength (Ashtakavarga)'],
  ['⌘5', 'Dasha'],
  ['⌘6', 'Yogas'],
  ['⌘7', 'Transits (Gochara)'],
  ['⌘8', 'Sade Sati'],
  ['⌘,', 'Settings'],
  ['⌘D', 'Download chart'],
  ['Esc', 'Close drawer'],
];

const ABOUT = `Vedic uses the sidereal zodiac with a chosen ayanamsa (Lahiri default). Houses are whole-sign per Parashara. Dasha math uses the sidereal year (365.25636 days). All computations run locally.`;

const ACCENT = '#f5d680';

export default function SettingsDrawer() {
  const open      = useVedic(s => s.settingsOpen);
  const close     = useVedic(s => s.closeSettings);
  const ayanamsa  = useVedic(s => s.ayanamsa);
  const setAyan   = useVedic(s => s.setAyanamsa);
  const format    = useVedic(s => s.chartFormat);
  const setFormat = useVedic(s => s.setChartFormat);
  const uiMode    = useVedic(s => s.uiMode);
  const toggleUI  = useVedic(s => s.toggleUIMode);
  const advanced  = uiMode === 'advanced';

  return (
    <SettingsShell open={open} onClose={close} accent={ACCENT}
                   shortcuts={SHORTCUTS} aboutText={ABOUT}>
      <section>
        <div className="text-[10px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">Interface</div>
        <SettingsRow label="Mode" sub="Advanced reveals deeper panels in future versions.">
          <div className="flex gap-1">
            <SettingsPill active={!advanced} onClick={() => advanced && toggleUI()} accent={ACCENT}>Basic</SettingsPill>
            <SettingsPill active={advanced}  onClick={() => !advanced && toggleUI()} accent={ACCENT}>Advanced</SettingsPill>
          </div>
        </SettingsRow>
      </section>

      <section className="border-t border-white/10 pt-3 mt-3">
        <div className="text-[10px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">Ayanamsa</div>
        <SettingsRow label="Sidereal calibration" sub="Offset between tropical and sidereal zodiacs.">
          <div className="flex flex-wrap gap-1 justify-end max-w-[220px]">
            {[
              ['lahiri', 'Lahiri'],
              ['kp', 'KP'],
              ['raman', 'Raman'],
              ['truecitra', 'True Citra'],
              ['fagan_bradley', 'Fagan/Bradley'],
            ].map(([id, label]) => (
              <SettingsPill key={id} active={ayanamsa === id} onClick={() => setAyan(id)} accent={ACCENT}>{label}</SettingsPill>
            ))}
          </div>
        </SettingsRow>
      </section>

      <section className="border-t border-white/10 pt-3 mt-3">
        <div className="text-[10px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">Chart</div>
        <SettingsRow label="Format" sub="North rotates with the Lagna; South fixes the signs.">
          <div className="flex gap-1">
            <SettingsPill active={format === 'north'} onClick={() => setFormat('north')} accent={ACCENT}>North Indian</SettingsPill>
            <SettingsPill active={format === 'south'} onClick={() => setFormat('south')} accent={ACCENT}>South Indian</SettingsPill>
          </div>
        </SettingsRow>
      </section>
    </SettingsShell>
  );
}
