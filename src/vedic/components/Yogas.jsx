// Vedic — Yogas + Doshas + Argala + Rashi Drishti.
// Yogas group into Pancha Mahapurusha, Lunar, Special. Doshas list Kala
// Sarpa, Mangal Dosha, and combust planets. Argala shows interventional
// houses from any reference sign (default Lagna). Rashi Drishti shows the
// Jaimini sign-on-sign aspect web for occupied signs.

import React, { useState } from 'react';
import { useVedic } from '../store.js';
import { rashiAspectMap } from '../compute/drishti.js';
import { RASHIS } from '../compute/data.js';

const STRENGTH_TINT = {
  very_strong: { color: '#fff8dd', label: 'Very Strong' },
  strong:      { color: '#fff8dd', label: 'Strong'      },
  medium:      { color: '#f5d680', label: 'Medium'      },
  mild:        { color: '#d79b3a', label: 'Mild'        },
  caution:     { color: '#ff9a9a', label: 'Caution'     },
};
const SEVERITY_TINT = {
  strong:    { color: '#ff6a6a', label: 'Strong'    },
  medium:    { color: '#d79b3a', label: 'Medium'    },
  mitigated: { color: '#9adfa8', label: 'Mitigated' },
};

const GROUP_ORDER = [
  ['Pancha Mahapurusha — the five great-person yogas', /^pancha_/],
  ['Raja Yogas — kendra-trikona power combinations',   /^raja_/],
  ['Vipareeta Raja Yogas — adversity into authority',  /^vipareeta_/],
  ['Dhana Yogas — wealth combinations',                 /^dhana_/],
  ['Parivartana — sign exchange between lords',        /^parivartana_/],
  ['Neecha Bhanga — cancellation of debility',         /^neecha_bhanga_/],
  ['Lunar yogas — flanking the Moon',                  /^(sunapha|anapha|durudhura|kemadruma)$/],
  ['Special combinations',                              /.*/],   // catch-all
];

function groupYogas(yogas) {
  const groups = GROUP_ORDER.map(([title, re]) => ({ title, re, items: [] }));
  for (const y of yogas) {
    for (const g of groups) {
      if (g.re.test(y.id)) { g.items.push(y); break; }
    }
  }
  return groups.filter(g => g.items.length);
}

const TABS = [
  { id: 'yogas',   label: 'Yogas & Doshas' },
  { id: 'argala',  label: 'Argala' },
  { id: 'rashi',   label: 'Rashi Drishti' },
];

export default function Yogas() {
  const chart = useVedic(s => s.chart);
  const [tab, setTab] = useState('yogas');
  if (!chart) return null;

  return (
    <div className="w-full p-6 text-[#e6e6f0] max-w-[1400px] mx-auto space-y-6">
      <header>
        <h2 className="font-serif text-[24px] tracking-[0.12em] text-[#f5d680]">Yogas · Doshas · Argala · Rashi Drishti</h2>
        <p className="text-[13px] text-[#9b9bbd] mt-1 max-w-3xl leading-relaxed">
          Classical planetary combinations, afflictions, and interventional structures the chart fits. Each pane reads from a different lens — yogas describe archetypes, doshas describe afflictions, argala describes intervention, rashi drishti describes the sign-level aspect web (Jaimini).
        </p>
      </header>

      <nav className="flex gap-1 border-b border-white/10 -mb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-[12px] tracking-[0.15em] uppercase transition-colors border-b-2 ${
              tab === t.id
                ? 'border-[#f5d680] text-[#f5d680]'
                : 'border-transparent text-[#9b9bbd] hover:text-[#e6e6f0]'
            }`}
          >{t.label}</button>
        ))}
      </nav>

      {tab === 'yogas'  && <YogasAndDoshasPane chart={chart} />}
      {tab === 'argala' && <ArgalaPane chart={chart} />}
      {tab === 'rashi'  && <RashiDrishtiPane chart={chart} />}
    </div>
  );
}

function YogasAndDoshasPane({ chart }) {
  const yogas  = chart.yogas  || [];
  const doshas = chart.doshas || {};
  const groups = groupYogas(yogas);
  const hasAnyYoga  = yogas.length > 0;
  const hasAnyDosha = Object.keys(doshas).length > 0;
  return (
    <>
      {/* Yogas */}
      <section>
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-3">Yogas detected · {yogas.length}</div>
        {!hasAnyYoga && (
          <div className="bg-[#0c0c18] border border-white/10 rounded-md p-5 text-[12.5px] text-[#9b9bbd] italic">
            No major classical yogas detected. An "unyoga'd" chart isn't a poorer chart — the planets simply work individually rather than in tight combinations. Many highly successful charts have few flagged yogas.
          </div>
        )}
        {groups.map(group => (
          <div key={group.title} className="mb-5">
            <div className="text-[10.5px] tracking-[0.22em] uppercase text-[#6d6d88] mb-2">{group.title}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.items.map(y => (
                <YogaCard key={y.id} yoga={y} />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Doshas */}
      <section>
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-3">Doshas & special placements</div>
        {!hasAnyDosha && (
          <div className="bg-[#0c0c18] border border-white/10 rounded-md p-5 text-[12.5px] text-[#9adfa8] italic">
            No classical doshas (Kala Sarpa / Mangal / combustion) detected.
          </div>
        )}
        {doshas.kalaSarpa && <DoshaCard dosha={doshas.kalaSarpa} />}
        {doshas.mangal && <DoshaCard dosha={doshas.mangal} />}
        {doshas.combust && doshas.combust.length > 0 && (
          <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 mb-3">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[14px] font-serif text-[#d79b3a]">Combust planets · Astangata</div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-[#9b9bbd]">{doshas.combust.length} body{doshas.combust.length === 1 ? '' : 's'}</div>
            </div>
            <ul className="text-[12.5px] text-[#c8c8dd] space-y-1">
              {doshas.combust.map(c => (
                <li key={c.planet}>
                  <span className="text-[#f5d680]">{c.planet}</span> — {c.note}
                </li>
              ))}
            </ul>
            <div className="text-[10.5px] text-[#6d6d88] italic mt-2 leading-snug">
              A combust planet is "burnt" by the Sun's proximity — it loses some of its independent expression. Mercury especially is often combust because of its close orbit; many wise people have combust Mercury without ill effect.
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function YogaCard({ yoga }) {
  const s = STRENGTH_TINT[yoga.strength] || STRENGTH_TINT.medium;
  return (
    <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 hover:border-[#f5d680]/30 transition-colors">
      <div className="flex items-baseline justify-between mb-1">
        <div className="font-serif text-[15px] text-[#fff8dd] tracking-wide">{yoga.name}</div>
        <span className="text-[10px] tracking-[0.18em] uppercase font-mono" style={{ color: s.color }}>{s.label}</span>
      </div>
      <div className="text-[12px] text-[#9b9bbd] mb-2">{yoga.reason}</div>
      <div className="text-[12px] italic text-[#c8c8dd] font-serif leading-relaxed">{yoga.blurb}</div>
    </div>
  );
}

function DoshaCard({ dosha }) {
  const sev = SEVERITY_TINT[dosha.severity] || SEVERITY_TINT.medium;
  return (
    <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 mb-3">
      <div className="flex items-baseline justify-between mb-1">
        <div className="font-serif text-[15px] text-[#fff8dd] tracking-wide">{dosha.name}</div>
        <span className="text-[10px] tracking-[0.18em] uppercase font-mono" style={{ color: sev.color }}>{sev.label}</span>
      </div>
      <div className="text-[12px] text-[#9b9bbd] mb-2">{dosha.reason}</div>
      <div className="text-[12px] italic text-[#c8c8dd] font-serif leading-relaxed">{dosha.blurb}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARGALA pane
// ---------------------------------------------------------------------------

function ArgalaPane({ chart }) {
  const argala = chart.argala || [];
  // Default reference = Lagna (house 1). User can pick any of the 12 houses.
  const [refHouse, setRefHouse] = useState(1);
  const ref = argala.find(r => r.house === refHouse) || argala[0];
  if (!ref) return null;

  return (
    <section className="space-y-4">
      <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">Argala — interventional houses</div>
        <p className="text-[12.5px] text-[#9b9bbd] leading-relaxed max-w-3xl">
          From any reference sign, the 2nd, 4th, 5th and 11th houses exert <em className="text-[#f5d680] font-serif">primary argala</em> — planets there intervene in the affairs of the reference. The 12th, 10th, 9th and 3rd respectively exert <em className="text-[#fff8dd] font-serif">virodha argala</em> — counter-intervention. When the virodha sign holds as many or more planets as the primary, the primary is read as cancelled. The 3rd is sometimes read as a secondary "weak" argala in its own right.
        </p>
      </div>

      <div className="bg-[#0c0c18] border border-white/10 rounded-md p-3 flex flex-wrap items-center gap-2">
        <span className="text-[10.5px] tracking-[0.22em] uppercase text-[#9b9bbd]">Reference</span>
        {argala.map(r => (
          <button
            key={r.house}
            onClick={() => setRefHouse(r.house)}
            title={`House ${r.house} · ${r.signName}`}
            className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
              refHouse === r.house
                ? 'bg-[#f5d680]/15 border-[#f5d680]/60 text-[#f5d680]'
                : 'border-white/15 text-[#9b9bbd] hover:text-[#e6e6f0]'
            }`}
          >
            H{r.house}{r.house === 1 ? ' · Lagna' : ''} · {RASHIS[r.sign].glyph}
          </button>
        ))}
      </div>

      <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4">
        <div className="text-[14px] font-serif text-[#fff8dd] mb-3">
          Argala on House {ref.house} · {RASHIS[ref.sign].glyph} {ref.signName}
        </div>
        <div className="space-y-3">
          {ref.primary.map(a => <ArgalaRow key={a.kind} entry={a} kind="primary" />)}
          {ref.secondary.map(a => <ArgalaRow key={a.kind} entry={a} kind="secondary" />)}
        </div>
      </div>
    </section>
  );
}

function ArgalaRow({ entry, kind }) {
  const occupants = entry.planets || [];
  const virodhaPlanets = entry.virodhaPlanets || [];
  const cancelled = entry.cancelled;
  const hasArgala = occupants.length > 0;
  return (
    <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_1fr] gap-3 items-baseline border-b border-white/5 pb-3 last:border-b-0">
      <div className="text-[12.5px]">
        <div className="text-[#f5d680] font-serif">{entry.kind} from</div>
        <div className="text-[10.5px] text-[#9b9bbd] tracking-wide">
          {kind === 'secondary' ? 'secondary argala' : 'primary argala'}
        </div>
      </div>
      <div>
        <div className="text-[11px] text-[#9b9bbd] tracking-[0.18em] uppercase">{RASHIS[entry.sign].glyph} {entry.signName} · H{entry.house}</div>
        {hasArgala ? (
          <div className="text-[12.5px] text-[#fff8dd] mt-0.5">
            {occupants.join(' · ')}
            {cancelled && (
              <span className="ml-2 text-[10.5px] tracking-[0.15em] uppercase text-[#ff9a9a]">cancelled</span>
            )}
          </div>
        ) : (
          <div className="text-[12px] text-[#6d6d88] italic mt-0.5">No occupants — argala dormant</div>
        )}
      </div>
      <div>
        {entry.virodhaSign != null ? (
          <>
            <div className="text-[11px] text-[#9b9bbd] tracking-[0.18em] uppercase">
              virodha · {RASHIS[entry.virodhaSign].glyph} {entry.virodhaSignName} · H{entry.virodhaHouse}
            </div>
            <div className="text-[12.5px] text-[#c8c8dd] mt-0.5">
              {virodhaPlanets.length ? virodhaPlanets.join(' · ') : <span className="text-[#6d6d88] italic">no counter-occupants</span>}
            </div>
          </>
        ) : (
          <div className="text-[11px] text-[#6d6d88] italic">no classical virodha pair</div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RASHI DRISHTI pane (Jaimini sign-on-sign aspects)
// ---------------------------------------------------------------------------

function RashiDrishtiPane({ chart }) {
  const map = rashiAspectMap(chart);
  return (
    <section className="space-y-4">
      <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4">
        <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">Rashi Drishti — Jaimini sign aspects</div>
        <p className="text-[12.5px] text-[#9b9bbd] leading-relaxed max-w-3xl">
          The Jaimini system reads aspects between <em className="text-[#f5d680] font-serif">signs themselves</em>, not just between planets. Movable signs aspect Fixed signs (excluding the immediately following one); Fixed signs aspect Movable (excluding the preceding one); Dual signs aspect the other three Duals. Only signs that hold a planet (or the Lagna) are surfaced here — the rest never project an active aspect.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {map.map(row => (
          <div key={row.fromSign} className="bg-[#0c0c18] border border-white/10 rounded-md p-3">
            <div className="flex items-baseline justify-between mb-2">
              <div className="font-serif text-[14px] text-[#fff8dd]">
                {RASHIS[row.fromSign].glyph} {RASHIS[row.fromSign].en}
              </div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-[#9b9bbd]">House {row.fromHouse}</div>
            </div>
            <div className="space-y-1.5">
              {row.targets.length === 0 && (
                <div className="text-[11.5px] text-[#6d6d88] italic">No targets</div>
              )}
              {row.targets.map(t => (
                <div key={t.sign} className="flex items-baseline justify-between text-[11.5px] border-b border-dashed border-white/5 pb-1 last:border-b-0">
                  <span className="text-[#c8c8dd]">→ {RASHIS[t.sign].glyph} {RASHIS[t.sign].en} <span className="text-[#6d6d88]">· H{t.house}</span></span>
                  <span className="text-[#f5d680] text-[11px]">{t.planetsThere.length ? t.planetsThere.join(', ') : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
