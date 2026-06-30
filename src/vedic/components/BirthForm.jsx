// Vedic birth form. Same fields and look as Western so the experience is
// continuous when a user switches systems. Submitting computes the Vedic
// chart and enters the app.

import React, { useEffect, useRef, useState } from 'react';
import { useVedic, profileKey } from '../store.js';
import { searchLocation, offsetMinutesForZoneAt } from '../../personal/astro/geocode.js';
import SystemNav from '../../shared/shell/SystemNav.jsx';
import ProfilesDropdown from '../../shared/shell/ProfilesDropdown.jsx';

function tzLabel(min) {
  const sign = min >= 0 ? '+' : '-';
  const a = Math.abs(min);
  const h = Math.floor(a / 60).toString().padStart(2, '0');
  const m = (a % 60).toString().padStart(2, '0');
  return `UTC${sign}${h}:${m}`;
}

export default function BirthForm() {
  const birth           = useVedic(s => s.birth);
  const setBirth        = useVedic(s => s.setBirth);
  const enter           = useVedic(s => s.enter);
  const profiles        = useVedic(s => s.profiles);
  const rememberProfile = useVedic(s => s.rememberProfile);
  const forgetProfile   = useVedic(s => s.forgetProfile);
  const clearProfiles   = useVedic(s => s.clearProfiles);
  const useProfile      = useVedic(s => s.useProfile);
  const timeUnknownGlobal = useVedic(s => s.timeUnknown);
  const setTimeUnknown    = useVedic(s => s.setTimeUnknown);

  const [form, setForm] = useState({
    name: birth.name || '',
    date: isoDate(birth),
    time: isoTime(birth),
    timeUnknown: !!timeUnknownGlobal,
    latMag: Math.abs(birth.latDeg).toString(),
    latHem: birth.latDeg >= 0 ? 'N' : 'S',
    lonMag: Math.abs(birth.lonDeg).toString(),
    lonHem: birth.lonDeg >= 0 ? 'E' : 'W',
    tzOffsetMin: birth.tzOffsetMin,
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const latMag = parseFloat(form.latMag);
  const lonMag = parseFloat(form.lonMag);
  const lat = Number.isFinite(latMag) ? (form.latHem === 'N' ?  latMag : -latMag) : NaN;
  const lon = Number.isFinite(lonMag) ? (form.lonHem === 'E' ?  lonMag : -lonMag) : NaN;
  const tz  = parseInt(form.tzOffsetMin, 10);
  // timeUnknown relaxes the TIME requirement only — lat/lon/tz/date must
  // still be valid because Swiss WASM crashes hard on NaN coords (and the
  // chart compute is meaningless without them).
  const canSubmit = !!form.date &&
    Number.isFinite(lat) && Math.abs(lat) <= 90 &&
    Number.isFinite(lon) && Math.abs(lon) <= 180 &&
    Number.isFinite(tz)  && tz >= -720 && tz <= 840;
  const canSubmitFinal = canSubmit && (form.timeUnknown || !!form.time);

  const submit = (e) => {
    e?.preventDefault?.();
    if (!canSubmitFinal) return;
    const [y, mo, d]  = form.date.split('-').map(Number);
    const [hh, mm]    = form.timeUnknown ? [12, 0] : form.time.split(':').map(Number);
    const next = {
      name: form.name.trim() || 'Untitled',
      year: y, month: mo, day: d, hour: hh, minute: mm,
      latDeg: lat, lonDeg: lon, tzOffsetMin: tz,
      placeName: `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`,
    };
    setBirth(next);
    rememberProfile(next);
    setTimeUnknown(!!form.timeUnknown);
    enter();
  };

  // City search (same Open-Meteo endpoint Western uses).
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [cityError, setCityError] = useState('');
  const [cityLoading, setCityLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef(0);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = cityQuery.trim();
    if (q.length < 2) { setCityResults([]); setCityError(''); return; }
    setCityLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const r = await searchLocation(q);
        setCityResults(r);
        setCityError(r.length === 0 ? 'No matches' : '');
      } catch { setCityResults([]); setCityError('Search unavailable. Enter lat/lon manually.'); }
      finally { setCityLoading(false); }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [cityQuery]);

  const applyLocation = (loc) => {
    const birthDate = form.date ? new Date(form.date + 'T' + (form.time || '12:00') + ':00Z') : new Date();
    const tz = offsetMinutesForZoneAt(loc.timezone, birthDate);
    setForm((f) => ({
      ...f,
      latMag: Math.abs(loc.latitude).toFixed(4),
      latHem: loc.latitude >= 0 ? 'N' : 'S',
      lonMag: Math.abs(loc.longitude).toFixed(4),
      lonHem: loc.longitude >= 0 ? 'E' : 'W',
      tzOffsetMin: tz,
    }));
    setCityQuery(`${loc.name}${loc.country ? ', ' + loc.country : ''}`);
    setShowResults(false);
  };

  const [profilesOpen, setProfilesOpen] = useState(false);

  const loadFromProfile = (p) => setForm({
    name: p.name || '',
    date: isoDate(p), time: isoTime(p),
    latMag: Math.abs(p.latDeg).toString(),
    latHem: p.latDeg >= 0 ? 'N' : 'S',
    lonMag: Math.abs(p.lonDeg).toString(),
    lonHem: p.lonDeg >= 0 ? 'E' : 'W',
    tzOffsetMin: p.tzOffsetMin,
  });

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#080810]">
      <SystemNav activeId="vedic" />
      <div className="flex-1 w-full flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-6">
            <div className="text-[#9b9bbd] text-[11px] tracking-[0.35em] uppercase">Ology · Jyotish</div>
            <h1 className="font-serif text-[32px] tracking-[0.12em] mt-1 text-[#f5d680]">
              {profiles.length > 0 ? 'New Chart' : 'Cast Your Janma Kundali'}
            </h1>
            <p className="text-[13px] text-[#9b9bbd] mt-2 max-w-[560px] mx-auto leading-snug">
              Enter the moment and place of birth. Vedic charts use the
              sidereal zodiac (Lahiri ayanamsa by default) — a tradition
              tracking the visible stars rather than the seasons.
            </p>
          </div>

          <form onSubmit={submit} className="bg-[#0c0c18]/90 border border-white/10 rounded-lg p-6 shadow-2xl text-[#e6e6f0]">
            <div className="grid grid-cols-12 gap-x-4 gap-y-3">
              <Field label="Name (optional)" span={12}>
                <div className="relative">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    className="form-input"
                    style={profiles.length > 0 ? { paddingRight: 130 } : undefined}
                    placeholder="For your reference only"
                  />
                  <ProfilesDropdown
                    profiles={profiles}
                    profileKey={profileKey}
                    onSelect={useProfile}
                    onLoad={loadFromProfile}
                    onForget={forgetProfile}
                    onClearAll={clearProfiles}
                    profilesOpen={profilesOpen}
                    setProfilesOpen={setProfilesOpen}
                  />
                </div>
              </Field>

              <Field label="Date of birth" span={3}>
                <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} min="1500-01-01" max="2080-12-31" className="form-input" style={{ colorScheme: 'dark' }} required />
              </Field>

              <Field label="Time of birth (local)" span={3}>
                <input type="time" value={form.time} onChange={(e) => update('time', e.target.value)} className="form-input" style={{ colorScheme: 'dark' }} required disabled={form.timeUnknown} />
                <label className="mt-1 flex items-center gap-2 text-[11px] text-[#9b9bbd] cursor-pointer">
                  <input type="checkbox" checked={!!form.timeUnknown} onChange={(e) => update('timeUnknown', e.target.checked)} />
                  Birth time unknown — Lagna and houses won't be reliable.
                </label>
              </Field>

              <Field label="Find a place (optional)" span={6}>
                <div className="relative">
                  <input type="text" value={cityQuery} onChange={(e) => { setCityQuery(e.target.value); setShowResults(true); }} onFocus={() => setShowResults(true)} onBlur={() => setTimeout(() => setShowResults(false), 150)} className="form-input" placeholder="Type a city to auto-fill coordinates + timezone…" />
                  {showResults && (cityResults.length > 0 || cityError || cityLoading) && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-[#0b0b15] border border-white/10 rounded max-h-64 overflow-y-auto">
                      {cityLoading && <div className="px-3 py-2 text-[12px] text-[#9b9bbd]">Searching…</div>}
                      {!cityLoading && cityError && <div className="px-3 py-2 text-[12px] text-[#ff9a9a]">{cityError}</div>}
                      {!cityLoading && cityResults.map((r) => (
                        <button type="button" key={r.id} onMouseDown={(e) => { e.preventDefault(); applyLocation(r); }} className="w-full text-left px-3 py-1.5 hover:bg-white/5">
                          <div className="text-[13px] text-[#e6e6f0]">{r.name}{r.admin ? ` · ${r.admin}` : ''}{r.country ? `, ${r.country}` : ''}</div>
                          <div className="text-[11px] text-[#6d6d88]">{Math.abs(r.latitude).toFixed(2)}°{r.latitude >= 0 ? 'N' : 'S'} · {Math.abs(r.longitude).toFixed(2)}°{r.longitude >= 0 ? 'E' : 'W'}{r.timezone ? ` · ${r.timezone}` : ''}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>

              <Field label="Latitude" span={3}>
                <div className="flex gap-1">
                  <input type="number" step="0.0001" min="0" max="90" value={form.latMag} onChange={(e) => update('latMag', e.target.value)} className="form-input" style={{ flex: '1 1 auto', minWidth: 0 }} required />
                  <select value={form.latHem} onChange={(e) => update('latHem', e.target.value)} className="form-input" style={{ flex: '0 0 64px', width: 64, colorScheme: 'dark' }}>
                    <option value="N">N</option><option value="S">S</option>
                  </select>
                </div>
              </Field>
              <Field label="Longitude" span={3}>
                <div className="flex gap-1">
                  <input type="number" step="0.0001" min="0" max="180" value={form.lonMag} onChange={(e) => update('lonMag', e.target.value)} className="form-input" style={{ flex: '1 1 auto', minWidth: 0 }} required />
                  <select value={form.lonHem} onChange={(e) => update('lonHem', e.target.value)} className="form-input" style={{ flex: '0 0 64px', width: 64, colorScheme: 'dark' }}>
                    <option value="E">E</option><option value="W">W</option>
                  </select>
                </div>
              </Field>

              <Field label={`Timezone · ${tzLabel(tz || 0)}`} span={6}>
                <input type="range" min="-720" max="840" step="15" value={form.tzOffsetMin} onChange={(e) => update('tzOffsetMin', e.target.value)} className="w-full spine-scrub" />
                <div className="flex justify-between text-[10px] text-[#6d6d88] mt-0.5">
                  <span>UTC−12</span><span>UTC</span><span>UTC+14</span>
                </div>
              </Field>
            </div>

            <div className="mt-5">
              <button type="submit" disabled={!canSubmitFinal} className="w-full py-3 rounded-md text-[13px] tracking-[0.3em] uppercase bg-[#f5d680] text-[#0b0b15] font-medium hover:bg-[#fff3c0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Cast this Vedic Chart
              </button>
            </div>
          </form>

          <p className="text-[11px] text-[#6d6d88] mt-4 text-center italic">
            Everything runs locally in your browser — your birth details never leave this device.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, span = 1, children }) {
  // Mobile: every field full-width (col-span-12). Tablet+ (sm:) restores
  // the desktop grid (3/6/12). Keeps the form readable on phones without
  // ever cutting the inputs in half.
  const desktopCol = ({ 1:'sm:col-span-3', 2:'sm:col-span-6', 3:'sm:col-span-3', 4:'sm:col-span-4', 6:'sm:col-span-6', 12:'sm:col-span-12' })[span] || 'sm:col-span-3';
  return (
    <div className={`col-span-12 ${desktopCol}`}>
      <div className="text-[11px] tracking-[0.2em] uppercase text-[#9b9bbd] mb-1">{label}</div>
      {children}
    </div>
  );
}
function isoDate(b) { return `${String(b.year).padStart(4,'0')}-${String(b.month).padStart(2,'0')}-${String(b.day).padStart(2,'0')}`; }
function isoTime(b) { return `${String(b.hour).padStart(2,'0')}:${String(b.minute).padStart(2,'0')}`; }
