// Chinese BaZi — settings drawer.
// Mounts the system-specific gender choice into the shared SettingsShell.

import React from 'react';
import { useBazi } from '../store.js';
import SettingsShell, { SettingsRow, SettingsPill } from '../../shared/shell/SettingsShell.jsx';

const SHORTCUTS = [
  ['⌘1', 'Pillars'],
  ['⌘2', 'Day Master'],
  ['⌘3', 'Ten Gods'],
  ['⌘4', 'Luck Pillars'],
  ['⌘,', 'Settings'],
  ['⌘D', 'Download chart'],
  ['Esc', 'Close drawer'],
];

const ABOUT = `BaZi reads the four pillars of birth. The solar year boundary is Lichun (~Feb 4); the month boundary is each of the 12 jié solar terms; the day cycle is the 60-day sexagenary cycle anchored on 1900-01-01 = 甲戌; the hour follows the Five Mice rule from the day stem. Interpretations on this site are written from scratch — none of the text is taken from any external source.`;

export default function SettingsDrawer() {
  const open  = useBazi(s => s.settingsOpen);
  const close = useBazi(s => s.closeSettings);
  const gender = useBazi(s => s.gender);
  const setGender = useBazi(s => s.setGender);

  return (
    <SettingsShell open={open} onClose={close} accent="#ff6a6a"
                   shortcuts={SHORTCUTS} aboutText={ABOUT}>
      <section>
        <div className="text-[10px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">Gender</div>
        <div className="text-[11.5px] text-[#9b9bbd] leading-relaxed mb-2">
          Used to determine Luck Pillar direction (forward vs backward through the sexagenary cycle from the Month Pillar).
        </div>
        <div className="flex gap-1.5">
          <SettingsPill active={gender === 'male'}   onClick={() => setGender('male')}   accent="#ff6a6a">Male</SettingsPill>
          <SettingsPill active={gender === 'female'} onClick={() => setGender('female')} accent="#ff6a6a">Female</SettingsPill>
        </div>
      </section>
    </SettingsShell>
  );
}
