// Gematria — single-word mode.
// Computes every system for the input, shows trinity, letter breakdown,
// resonances, reduction ladder + meaning + number fingerprint.

import React, { useMemo } from 'react';
import { useGematria } from '../store.js';
import { transliterate } from '../compute/transliterate.js';
import {
  computeForLang, calcTrinity, reduceNumber, getPrimaryMap, buildLetterBreakdown,
} from '../compute/calculate.js';
import { findEquivalents, EQUIV_SYSTEM } from '../compute/equivalents.js';
import { NUMBER_MEANINGS, fingerprint } from '../compute/numberMeanings.js';
import { getLetterLore } from '../compute/letterLore.js';

const PLACEHOLDERS = {
  english: 'Love, wisdom, your name…',
  hebrew:  'שלום · חכמה · אהבה',
  greek:   'Αγάπη · Σοφία · Λόγος',
  arabic:  'حب · حكمة · نور',
};
const VOWEL_DESCRIPTION = {
  english: 'Vowels: A · E · I · O · U',
  hebrew:  'Vowel-letters (matres lectionis): א · ה · ו · י',
  greek:   'Vowels: α · ε · η · ι · ο · υ · ω',
  arabic:  'Vowel-letters (long vowels): ا · و · ي',
};

const LANGS = [
  { id: 'english', label: 'English' },
  { id: 'hebrew',  label: 'Hebrew'  },
  { id: 'greek',   label: 'Greek'   },
  { id: 'arabic',  label: 'Arabic'  },
];

export default function Word() {
  const lang      = useGematria(s => s.lang);
  const input     = useGematria(s => s.input);
  const usePron   = useGematria(s => s.usePron);
  const useY      = useGematria(s => s.useYasVowel);
  const setUseY   = useGematria(s => s.setUseYasVowel);
  const openModal = useGematria(s => s.openLetterModal);

  const processed = useMemo(() => {
    if (usePron && lang !== 'english') return transliterate(input, lang);
    return input;
  }, [input, usePron, lang]);

  const systems   = useMemo(() => computeForLang(processed, lang), [processed, lang]);
  const primary   = systems.find(s => s.value > 0) || systems[0];
  const secondary = lang === 'english' ? systems[0] : lang === 'hebrew' ? systems[2] : lang === 'greek' ? systems[1] : systems[0];
  const reduced   = useMemo(() => reduceNumber(primary.value), [primary.value]);
  const trinity   = useMemo(() => calcTrinity(processed, lang, getPrimaryMap(lang), useY), [processed, lang, useY]);
  const cells     = useMemo(() => buildLetterBreakdown(processed, lang), [processed, lang]);
  const matches   = useMemo(() => findEquivalents(lang, primary.value, processed), [lang, primary.value, processed]);
  const fp        = useMemo(() => fingerprint(primary.value), [primary.value]);

  const meaning   = NUMBER_MEANINGS[reduced.final];

  if (!input.trim()) {
    return (
      <div className="text-center py-16 text-[#6d6d88] italic">
        <div className="text-5xl text-[#d79b3a]/60 mb-3">✧</div>
        Begin by entering a word above.<br/>
        Every letter holds a number, every number tells a story.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Headline cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PrimaryCard label={primary.name} value={primary.value} sub={primary.alt} desc={primary.desc} implies={primary.implies} />
        <PrimaryCard label={secondary.name} value={secondary.value} sub={secondary.alt} desc={secondary.desc} implies={secondary.implies} />
        <PrimaryCard
          label="Final Number"
          value={reduced.final}
          sub={reduced.isMaster ? 'Master · preserved' : `Reduced from ${primary.value}`}
          implies={meaning?.title}
          desc={meaning?.keywords}
          master={reduced.isMaster}
        />
      </section>

      {/* Letter breakdown */}
      {cells.length > 0 && (
        <section>
          <SectionTitle>Letter · by · letter</SectionTitle>
          <div className="bg-[#0c0c18] border border-white/10 rounded-lg p-5">
            <div
              className="flex flex-wrap gap-2 justify-center"
              style={{ direction: lang === 'hebrew' || lang === 'arabic' ? 'rtl' : 'ltr' }}
            >
              {cells.map((c, i) => {
                const lore = getLetterLore(c.glyph, lang);
                return (
                  <button
                    key={i}
                    onClick={() => openModal(c.glyph, lang)}
                    className="bg-black/30 border border-white/10 rounded-md px-3 py-2 min-w-[64px] flex flex-col items-center gap-1 hover:border-[#d79b3a]/60 hover:-translate-y-0.5 transition-all relative"
                  >
                    {lore && <span className="absolute top-0.5 right-1 text-[8px] text-[#d79b3a]/60">✶</span>}
                    <span className="text-[24px] text-[#e6e6f0] leading-none font-serif">{c.glyph}</span>
                    {c.name && <span className="text-[10px] italic text-[#6d6d88] font-serif">{c.name}</span>}
                    <span className="text-[12px] text-[#f5d680] font-mono">{c.value}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Trinity: Soul / Personality / Destiny */}
      {cells.length > 0 && (
        <section>
          <SectionTitle>The · numerology · trinity</SectionTitle>
          <div className="text-center text-[12px] italic text-[#6d6d88] font-serif mb-3">
            {VOWEL_DESCRIPTION[lang]}{lang === 'english' && useY ? ' · with Y' : ''}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TrinityCard
              glyph="✶ Vowels"
              name="Soul Urge"
              sub="Heart’s desire — what your soul wants from within."
              count={trinity.vCount}
              total={trinity.soul}
              letters={trinity.vowels}
            />
            <TrinityCard
              glyph="✶ Consonants"
              name="Personality"
              sub="Outer expression — how the world perceives you."
              count={trinity.cCount}
              total={trinity.personality}
              letters={trinity.consonants}
            />
            <TrinityCard
              glyph="✶ Whole word"
              name="Destiny / Expression"
              sub="Life path — the totality of who you are."
              count={trinity.vCount + trinity.cCount}
              total={trinity.destiny}
              letters={null}
            />
          </div>
        </section>
      )}

      {/* All systems */}
      <section>
        <SectionTitle>All · systems · and · their · meaning</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {systems.map(s => {
            const r = reduceNumber(s.value);
            return (
              <div key={s.name} className="bg-[#0c0c18] border border-white/10 rounded-md p-4 hover:bg-white/[0.03] hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-[14px] font-serif text-[#e6e6f0]">{s.name}</div>
                    <div className="text-[11px] italic text-[#d79b3a] font-serif">{s.alt}</div>
                  </div>
                  <div className="text-[20px] font-mono text-[#f5d680]">{s.value}</div>
                </div>
                <div className="text-[11px] text-[#6d6d88] leading-snug">{s.desc}</div>
                {r.final !== s.value && (
                  <div className="text-[10px] font-mono text-[#b79aff] mt-1.5 opacity-80">{r.steps.join(' → ')}{r.isMaster ? ' ✦ master' : ''}</div>
                )}
                {s.implies && <div className="text-[11px] italic text-[#d8caff] mt-1.5 pt-1.5 border-t border-white/5 leading-snug">{s.implies}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Resonances */}
      <section>
        <SectionTitle>Resonances · words · that · share · this · value</SectionTitle>
        <div className="bg-[#0c0c18] border border-white/10 rounded-lg p-5">
          <div className="text-[13px] italic text-[#9b9bbd] mb-3">
            By <em>gezera shava</em>, words sharing a value share a hidden kinship. Searching {EQUIV_SYSTEM[lang]} = <strong className="text-[#f5d680]">{primary.value}</strong>.
          </div>
          {matches.length === 0 ? (
            <div className="text-center italic text-[#6d6d88] text-[13px] py-2">
              No matches in the curated corpus — but every value has its kin.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {matches.map((m, i) => (
                <div key={i} className="bg-black/30 border border-white/10 rounded-md p-4 hover:border-[#d79b3a]/40 transition-colors">
                  <div className="text-[24px] text-[#f5d680] font-serif leading-tight mb-1">{m.word}</div>
                  {m.translit && <div className="text-[13px] italic text-[#9b9bbd] font-serif">{m.translit}</div>}
                  <div className="text-[10px] uppercase tracking-[0.1em] text-[#6d6d88] mt-1">{m.gloss}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Reduction + meaning */}
      <section>
        <SectionTitle>The · final · number</SectionTitle>
        <div className="bg-[#0c0c18] border border-white/10 rounded-lg p-6 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8 items-center">
          <div className="font-mono text-[14px] space-y-2">
            {reduced.steps.map((n, i) => (
              <div key={i} className="flex items-baseline gap-3 pb-2 border-b border-white/5 last:border-b-0">
                <span className="text-[#f5d680] font-serif italic">{i === 0 ? '∴' : '↓'}</span>
                <span className={i === reduced.steps.length - 1 ? 'text-[#f5d680] text-[17px]' : 'text-[#9b9bbd]'}>{n}</span>
                {(n === 11 || n === 22 || n === 33) && <em className="text-[#ff6a6a] italic text-[12px] ml-2">master — preserved</em>}
              </div>
            ))}
            {meaning && (
              <div className="mt-5 pt-5 border-t border-dashed border-white/10 font-serif italic text-[14px] text-[#9b9bbd] leading-relaxed text-center">
                <strong className="not-italic font-medium text-[#f5d680]">{meaning.title}</strong>
                <div className="text-[10px] tracking-[0.15em] uppercase text-[#fff8dd] mt-1.5 not-italic font-sans">{meaning.keywords}</div>
                <div className="mt-3">{meaning.body}</div>
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <div className={`w-[180px] h-[180px] rounded-full flex items-center justify-center font-serif text-[80px] font-light ${
              reduced.isMaster
                ? 'border border-[#ff6a6a]/60 text-[#ffd5dd]'
                : 'border border-[#d79b3a]/60 text-[#f5d680]'
            }`}
              style={{
                background: reduced.isMaster
                  ? 'radial-gradient(circle at 30% 30%, rgba(255,106,106,0.25), transparent 60%)'
                  : 'radial-gradient(circle at 30% 30%, rgba(245,214,128,0.25), transparent 60%)',
              }}
            >{reduced.final}</div>
          </div>
        </div>

        {/* Fingerprint */}
        {fp.length > 0 && (
          <div className="mt-5 bg-[#0c0c18] border border-white/5 rounded-lg p-5">
            <div className="text-[14px] italic text-[#9b9bbd] mb-3 font-serif">
              The fingerprint of <strong className="not-italic text-[#f5d680]">{primary.value}</strong>:
            </div>
            <div className="flex flex-wrap gap-2">
              {fp.map((f, i) => (
                <div key={i} className="bg-[#f5d680]/[0.06] border border-[#f5d680]/20 rounded-lg px-3 py-2 max-w-[280px]">
                  <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#f5d680] block mb-1">{f.tag}</span>
                  <span className="text-[12px] italic text-[#9b9bbd] font-serif leading-snug">{f.note}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Y-as-vowel toggle (English only) */}
      {lang === 'english' && (
        <div className="text-center pt-6">
          <label className="inline-flex items-center gap-2 cursor-pointer text-[12px] text-[#9b9bbd]">
            <input type="checkbox" checked={useY} onChange={e => setUseY(e.target.checked)} />
            Treat “Y” as a vowel
          </label>
        </div>
      )}
    </div>
  );
}

export function GematriaInputBar() {
  const lang       = useGematria(s => s.lang);
  const setLang    = useGematria(s => s.setLang);
  const input      = useGematria(s => s.input);
  const setInput   = useGematria(s => s.setInput);
  const usePron    = useGematria(s => s.usePron);
  const setUsePron = useGematria(s => s.setUsePron);

  const inputDir   = (lang === 'hebrew' || lang === 'arabic') && !usePron ? 'rtl' : 'ltr';
  const fontFamily =
    lang === 'hebrew' && !usePron ? 'var(--font-hebrew, "Frank Ruhl Libre", serif)' :
    lang === 'arabic' && !usePron ? 'var(--font-arabic, "Noto Naskh Arabic", serif)' :
    lang === 'greek'  && !usePron ? 'var(--font-greek,  "GFS Didot", serif)' :
    'var(--font-serif, "Cormorant Garamond", serif)';

  return (
    <div className="bg-[#0c0c18] border border-white/10 rounded-lg p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {LANGS.map(l => (
            <button
              key={l.id}
              onClick={() => setLang(l.id)}
              className={`text-[11px] px-3 py-1 rounded-full uppercase tracking-[0.08em] transition-colors ${
                lang === l.id
                  ? 'bg-[#f5d680]/20 text-[#f5d680]'
                  : 'text-[#9b9bbd] hover:text-[#e6e6f0]'
              }`}
            >{l.label}</button>
          ))}
        </div>
        {(lang === 'hebrew' || lang === 'greek' || lang === 'arabic') && (
          <label className="text-[10px] tracking-[0.15em] uppercase text-[#9b9bbd] flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={usePron} onChange={e => setUsePron(e.target.checked)} />
            Input by pronunciation
          </label>
        )}
      </div>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={PLACEHOLDERS[lang]}
        className="w-full bg-black/30 border border-white/10 rounded-md px-5 py-4 text-[24px] text-center text-[#e6e6f0] outline-none focus:border-[#d79b3a]/60"
        style={{ direction: inputDir, fontFamily }}
        autoFocus
      />
    </div>
  );
}

function PrimaryCard({ label, value, sub, desc, implies, master }) {
  return (
    <div className={`bg-[#0c0c18] border ${master ? 'border-[#ff6a6a]/40' : 'border-[#f5d680]/30'} rounded-xl p-6 text-center relative overflow-hidden`}>
      <div className="text-[11px] italic tracking-[0.15em] uppercase text-[#9b9bbd] mb-2 font-serif">{label}</div>
      <div className={`font-serif font-light text-[56px] leading-none ${master ? 'text-[#ffd5dd]' : 'text-[#f5d680]'}`}>{value}</div>
      <div className="text-[11px] text-[#6d6d88] mt-2 font-mono">{sub}</div>
      {(implies || desc) && (
        <div className="mt-3 pt-3 border-t border-dashed border-[#f5d680]/20 font-serif italic text-[12px] text-[#9b9bbd] leading-snug">
          {implies && <div className="font-sans not-italic text-[10px] uppercase tracking-[0.15em] text-[#fff8dd] mb-1">{implies}</div>}
          {desc}
        </div>
      )}
    </div>
  );
}

function TrinityCard({ glyph, name, sub, count, total, letters }) {
  const reduced = reduceNumber(total);
  const meaning = NUMBER_MEANINGS[reduced.final];
  return (
    <div className="bg-[#0c0c18] border border-white/10 rounded-xl p-5">
      <div className="text-[11px] italic tracking-[0.25em] uppercase text-[#d79b3a] mb-2 font-serif">{glyph}</div>
      <div className="text-[20px] font-serif text-[#e6e6f0] mb-1">{name}</div>
      <div className="text-[12px] italic text-[#6d6d88] font-serif mb-3">{sub}</div>
      <div className="flex justify-between items-baseline pb-2 border-b border-dashed border-white/5">
        <span className="text-[12px] italic text-[#6d6d88] font-serif">Sum ({count})</span>
        <span className="text-[16px] text-[#f5d680] font-mono">{total}</span>
      </div>
      <div className="flex justify-between items-baseline pt-2">
        <span className="text-[12px] italic text-[#6d6d88] font-serif">Reduced</span>
        <span className={`text-[24px] font-mono ${reduced.isMaster ? 'text-[#ffd5dd]' : 'text-[#f5d680]'}`}>{reduced.final}{reduced.isMaster ? ' ✦' : ''}</span>
      </div>
      {letters && letters.length > 0 && (
        <div className="text-[16px] text-[#d8caff] tracking-wide mt-2 break-words">{letters.join(' · ')}</div>
      )}
      {meaning && (
        <div className="mt-3 pt-3 border-t border-dashed border-white/5 font-serif italic text-[12px] text-[#9b9bbd] leading-relaxed">
          <strong className="not-italic font-medium text-[#f5d680]">{meaning.title}</strong> — {meaning.keywords}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="font-serif text-[20px] text-[#e6e6f0] tracking-[0.05em] mb-4 flex items-center gap-4">
      <span className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <span className="italic text-[#fff8dd]">{children}</span>
      <span className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}
