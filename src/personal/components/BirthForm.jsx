import React, { useEffect, useRef, useState } from 'react';
import { usePersonal, profileKey } from '../store.js';
import { searchLocation, offsetMinutesForZoneAt } from '../astro/geocode.js';
import SystemNav from '../../shared/shell/SystemNav.jsx';

function tzLabel(min) {
  const sign = min >= 0 ? '+' : '-';
  const a = Math.abs(min);
  const h = Math.floor(a / 60).toString().padStart(2, '0');
  const m = (a % 60).toString().padStart(2, '0');
  return `UTC${sign}${h}:${m}`;
}

export default function BirthForm() {
  const birth           = usePersonal(s => s.birth);
  const setBirth        = usePersonal(s => s.setBirth);
  const enter           = usePersonal(s => s.enter);
  const profiles        = usePersonal(s => s.profiles);
  const rememberProfile = usePersonal(s => s.rememberProfile);
  const forgetProfile   = usePersonal(s => s.forgetProfile);
  const clearProfiles   = usePersonal(s => s.clearProfiles);
  const useProfile      = usePersonal(s => s.useProfile);

  // Decompose stored signed lat/lon into magnitude + hemisphere for the form.
  const timeUnknownGlobal = usePersonal(s => s.timeUnknown);
  const setTimeUnknown    = usePersonal(s => s.setTimeUnknown);
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
  const canSubmit = !!form.date && !!form.time &&
    Number.isFinite(lat) && Math.abs(lat) <= 90 &&
    Number.isFinite(lon) && Math.abs(lon) <= 180 &&
    Number.isFinite(tz)  && tz >= -720 && tz <= 840;

  const canSubmitFinal = canSubmit || form.timeUnknown;
  const submit = (e) => {
    e?.preventDefault?.();
    if (!canSubmitFinal) return;
    const [y, mo, d]  = form.date.split('-').map(Number);
    const [hh, mm]    = form.timeUnknown ? [12, 0] : form.time.split(':').map(Number);
    const next = {
      name:        form.name.trim() || 'Untitled',
      year: y, month: mo, day: d,
      hour: hh, minute: mm,
      latDeg: lat,
      lonDeg: lon,
      tzOffsetMin: tz,
      placeName: `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`,
    };
    setBirth(next);
    rememberProfile(next);
    setTimeUnknown(!!form.timeUnknown);  // propagate to store so PrecisionBadge / NatalWheel gate ASC/MC
    enter();
  };

  // Phase 5: JSON import (counterpart to Settings drawer's JSON export).
  const onImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        const b = payload.birth;
        if (!b || !b.year) throw new Error('No birth in JSON');
        setForm(f => ({
          ...f,
          name: b.name || '',
          date: isoDate(b),
          time: isoTime(b),
          timeUnknown: false,
          latMag: Math.abs(b.latDeg).toString(),
          latHem: b.latDeg >= 0 ? 'N' : 'S',
          lonMag: Math.abs(b.lonDeg).toString(),
          lonHem: b.lonDeg >= 0 ? 'E' : 'W',
          tzOffsetMin: b.tzOffsetMin,
        }));
      } catch (err) {
        alert('Could not import chart: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // allow re-import of same file
  };

  const loadFromProfile = (p) => {
    setForm({
      name: p.name || '',
      date: isoDate(p),
      time: isoTime(p),
      latMag: Math.abs(p.latDeg).toString(),
      latHem: p.latDeg >= 0 ? 'N' : 'S',
      lonMag: Math.abs(p.lonDeg).toString(),
      lonHem: p.lonDeg >= 0 ? 'E' : 'W',
      tzOffsetMin: p.tzOffsetMin,
    });
  };

  // ---- Saved-charts dropdown (next to the Name field) ------------------
  const [profilesOpen, setProfilesOpen] = useState(false);
  const profilesRef = useRef(null);
  useEffect(() => {
    if (!profilesOpen) return;
    const handler = (e) => {
      if (profilesRef.current && !profilesRef.current.contains(e.target)) {
        setProfilesOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profilesOpen]);

  // ---- City search (Open-Meteo geocoding) -------------------------------
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [cityError, setCityError] = useState('');
  const [cityLoading, setCityLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef(0);

  useEffect(() => {
    // Debounced query.
    clearTimeout(debounceRef.current);
    const q = cityQuery.trim();
    if (q.length < 2) {
      setCityResults([]);
      setCityError('');
      return;
    }
    setCityLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const r = await searchLocation(q);
        setCityResults(r);
        setCityError(r.length === 0 ? 'No matches' : '');
      } catch (e) {
        setCityResults([]);
        setCityError('Search unavailable. Enter lat/lon manually.');
      } finally {
        setCityLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [cityQuery]);

  const applyLocation = (loc) => {
    // Fill lat/lon + derive tz offset at the entered birth date.
    const birthDate = form.date
      ? new Date(form.date + 'T' + (form.time || '12:00') + ':00Z')
      : new Date();
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

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#080810]">
      <SystemNav activeId="western" />
      <div className="flex-1 w-full flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl">
      <div className="text-center mb-6">
        <div className="text-[#9b9bbd] text-[11px] tracking-[0.35em] uppercase">Ology</div>
        <h1 className="font-serif text-[32px] tracking-[0.12em] mt-1 text-[#f5d680]">
          {profiles.length > 0 ? 'New Chart' : 'Cast a Chart'}
        </h1>
        <p className="text-[13px] text-[#9b9bbd] mt-2 max-w-[560px] mx-auto leading-snug">
          Enter the moment and place of birth. Time accuracy matters for the
          Ascendant and houses — tick the box below if you don't know it.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="bg-[#0c0c18]/90 border border-white/10 rounded-lg p-6
                   shadow-2xl text-[#e6e6f0]"
      >

        <div className="grid grid-cols-12 gap-x-4 gap-y-3">
          <Field label="Name (optional)" span={12}>
            <div className="relative" ref={profilesRef}>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                className="form-input"
                style={profiles.length > 0 ? { paddingRight: 130 } : undefined}
                placeholder="For your reference only"
              />
              {profiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setProfilesOpen(v => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 btn-ghost
                             flex items-center gap-1"
                  style={{ padding: '4px 8px' }}
                  title="Open saved charts"
                >
                  <span>Saved · {profiles.length}</span>
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: profilesOpen ? 'rotate(180deg)' : 'none' }}>
                    <path d="M2 4l3 3 3-3" />
                  </svg>
                </button>
              )}
              {profilesOpen && profiles.length > 0 && (
                <div className="absolute z-20 top-full right-0 mt-1 bg-[#0b0b15] border border-white/10
                                rounded-md shadow-xl w-[340px] max-h-[320px] overflow-y-auto">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 sticky top-0 bg-[#0b0b15]">
                    <div className="text-[10px] tracking-[0.25em] uppercase text-[#9b9bbd]">
                      Saved charts · {profiles.length}
                    </div>
                    <button
                      type="button"
                      onClick={() => { clearProfiles(); setProfilesOpen(false); }}
                      className="text-[9.5px] tracking-[0.22em] uppercase text-[#6d6d88] hover:text-white"
                    >clear all</button>
                  </div>
                  {profiles.map((p) => {
                    const key = profileKey(p);
                    return (
                      <div
                        key={key}
                        className="group flex items-center hover:bg-white/5 border-b border-white/5 last:border-b-0"
                      >
                        <button
                          type="button"
                          onClick={() => { useProfile(p); setProfilesOpen(false); }}
                          className="flex-1 text-left px-3 py-2 min-w-0"
                          title="Load and open this chart"
                        >
                          <div className="text-[#e6e6f0] text-[12.5px] truncate">
                            {p.name || 'Untitled'}
                          </div>
                          <div className="text-[#9b9bbd] text-[10.5px] truncate">
                            {p.day}/{p.month}/{p.year} · {String(p.hour).padStart(2,'0')}:{String(p.minute).padStart(2,'0')} ·{' '}
                            {Math.abs(p.latDeg).toFixed(1)}°{p.latDeg >= 0 ? 'N' : 'S'} ·{' '}
                            {Math.abs(p.lonDeg).toFixed(1)}°{p.lonDeg >= 0 ? 'E' : 'W'}
                          </div>
                        </button>
                        <div className="flex gap-0.5 pr-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => { loadFromProfile(p); setProfilesOpen(false); }}
                            className="text-[#6d6d88] hover:text-white opacity-0 group-hover:opacity-100
                                       px-1.5 py-0.5 text-[12px]"
                            title="Load into this form (don't enter yet)"
                          >✎</button>
                          <button
                            type="button"
                            onClick={() => forgetProfile(key)}
                            className="text-[#6d6d88] hover:text-[#ff6a6a] opacity-0 group-hover:opacity-100
                                       px-1.5 py-0.5 text-[14px] leading-none"
                            title="Remove this saved chart"
                          >×</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Field>

          <Field label="Date of birth" span={3}>
            <input
              type="date"
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
              min="1500-01-01"
              max="2080-12-31"
              className="form-input"
              style={{ colorScheme: 'dark' }}
              required
            />
          </Field>

          <Field label="Time of birth (local)" span={3}>
            <input
              type="time"
              value={form.time}
              onChange={(e) => update('time', e.target.value)}
              className="form-input"
              style={{ colorScheme: 'dark' }}
              required
              disabled={form.timeUnknown}
            />
            <label className="mt-1 flex items-center gap-2 text-[11px] text-[#9b9bbd] cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.timeUnknown}
                onChange={(e) => update('timeUnknown', e.target.checked)}
              />
              I don't know the exact birth time — cast a solar chart (noon).
            </label>
          </Field>

          {/* Optional city search — fills lat / lon / timezone. */}
          <Field label="Find a place (optional)" span={6}>
            <div className="relative">
              <input
                type="text"
                value={cityQuery}
                onChange={(e) => { setCityQuery(e.target.value); setShowResults(true); }}
                onFocus={() => setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 150)}
                className="form-input"
                placeholder="Type a city to auto-fill coordinates + timezone…"
              />
              {showResults && (cityResults.length > 0 || cityError || cityLoading) && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-[#0b0b15] border border-white/10 rounded max-h-64 overflow-y-auto">
                  {cityLoading && (
                    <div className="px-3 py-2 text-[12px] text-[#9b9bbd]">Searching…</div>
                  )}
                  {!cityLoading && cityError && (
                    <div className="px-3 py-2 text-[12px] text-[#ff9a9a]">{cityError}</div>
                  )}
                  {!cityLoading && cityResults.map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      onMouseDown={(e) => { e.preventDefault(); applyLocation(r); }}
                      className="w-full text-left px-3 py-1.5 hover:bg-white/5"
                    >
                      <div className="text-[13px] text-[#e6e6f0]">
                        {r.name}{r.admin ? ` · ${r.admin}` : ''}{r.country ? `, ${r.country}` : ''}
                      </div>
                      <div className="text-[11px] text-[#6d6d88]">
                        {Math.abs(r.latitude).toFixed(2)}°{r.latitude >= 0 ? 'N' : 'S'} ·{' '}
                        {Math.abs(r.longitude).toFixed(2)}°{r.longitude >= 0 ? 'E' : 'W'}
                        {r.timezone ? ` · ${r.timezone}` : ''}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <Field label="Latitude" span={3}>
            <div className="flex gap-1">
              <input
                type="number" step="0.0001" min="0" max="90"
                value={form.latMag}
                onChange={(e) => update('latMag', e.target.value)}
                className="form-input"
                style={{ flex: '1 1 auto', minWidth: 0 }}
                placeholder="e.g. 28.6139"
                required
              />
              <select
                value={form.latHem}
                onChange={(e) => update('latHem', e.target.value)}
                className="form-input"
                style={{ flex: '0 0 64px', width: 64, colorScheme: 'dark' }}
              >
                <option value="N">N</option>
                <option value="S">S</option>
              </select>
            </div>
          </Field>
          <Field label="Longitude" span={3}>
            <div className="flex gap-1">
              <input
                type="number" step="0.0001" min="0" max="180"
                value={form.lonMag}
                onChange={(e) => update('lonMag', e.target.value)}
                className="form-input"
                style={{ flex: '1 1 auto', minWidth: 0 }}
                placeholder="e.g. 77.2090"
                required
              />
              <select
                value={form.lonHem}
                onChange={(e) => update('lonHem', e.target.value)}
                className="form-input"
                style={{ flex: '0 0 64px', width: 64, colorScheme: 'dark' }}
              >
                <option value="E">E</option>
                <option value="W">W</option>
              </select>
            </div>
          </Field>

          <Field label={`Timezone · ${tzLabel(tz || 0)}`} span={6}>
            <input
              type="range"
              min="-720" max="840" step="15"
              value={form.tzOffsetMin}
              onChange={(e) => update('tzOffsetMin', e.target.value)}
              className="w-full spine-scrub"
            />
            <div className="flex justify-between text-[10px] text-[#6d6d88] mt-0.5">
              <span>UTC−12</span>
              <span>UTC</span>
              <span>UTC+14</span>
            </div>
          </Field>
        </div>
        <div className="text-[10.5px] text-[#6d6d88] mt-2 leading-snug">
          The place search above fills latitude, longitude, and timezone. The slider lets you override
          the UTC offset manually for historical dates where DST rules may differ.
        </div>

        <div className="mt-5 flex items-center gap-4">
          <button
            type="submit"
            disabled={!canSubmitFinal}
            className="flex-1 py-3 rounded-md text-[13px] tracking-[0.3em] uppercase
                       bg-[#f5d680] text-[#0b0b15] font-medium hover:bg-[#fff3c0]
                       disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Cast This Chart
          </button>
          <label className="shrink-0 text-[11px] text-[#9b9bbd] cursor-pointer underline hover:text-[#e6e6f0]">
            Import JSON
            <input type="file" accept=".json,application/json" className="hidden" onChange={onImportJSON} />
          </label>
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
  // 12-column grid support. Legacy `span={2}` maps to 6 cols (half-width);
  // new callers pass explicit numeric spans (span={3}, span={6}, span={12}).
  // On mobile (< sm) every field collapses to full width to keep inputs
  // readable; sm: prefix restores the desktop grid.
  const desktopCol = {
    1: 'sm:col-span-3',
    2: 'sm:col-span-6',
    3: 'sm:col-span-3',
    4: 'sm:col-span-4',
    6: 'sm:col-span-6',
    12: 'sm:col-span-12',
  }[span] || 'sm:col-span-3';
  return (
    <div className={`col-span-12 ${desktopCol}`}>
      <div className="text-[11px] tracking-[0.2em] uppercase text-[#9b9bbd] mb-1">{label}</div>
      {children}
    </div>
  );
}

function isoDate(b) {
  const y = String(b.year).padStart(4, '0');
  const m = String(b.month).padStart(2, '0');
  const d = String(b.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function isoTime(b) {
  const h = String(b.hour).padStart(2, '0');
  const m = String(b.minute).padStart(2, '0');
  return `${h}:${m}`;
}
