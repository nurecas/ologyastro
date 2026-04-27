// Gematria — compare two words. Highlights system rows where the values match.

import React, { useMemo } from 'react';
import { useGematria } from '../store.js';
import { computeForLang, reduceNumber } from '../compute/calculate.js';

const LANGS = [
  { id: 'english', label: 'English', placeholder: 'love' },
  { id: 'hebrew',  label: 'Hebrew',  placeholder: 'אהבה' },
  { id: 'greek',   label: 'Greek',   placeholder: 'αγαπη' },
  { id: 'arabic',  label: 'Arabic',  placeholder: 'حب' },
];

export default function Compare() {
  const lang     = useGematria(s => s.compareLang);
  const setLang  = useGematria(s => s.setCompareLang);
  const a        = useGematria(s => s.compareA);
  const b        = useGematria(s => s.compareB);
  const setComp  = useGematria(s => s.setCompare);

  const langDef = LANGS.find(l => l.id === lang);
  const rtl = lang === 'hebrew' || lang === 'arabic';

  const sA = useMemo(() => computeForLang(a, lang), [a, lang]);
  const sB = useMemo(() => computeForLang(b, lang), [b, lang]);
  const primA = sA.find(s => s.value > 0) || sA[0];
  const primB = sB.find(s => s.value > 0) || sB[0];
  const matchCount = sA.reduce((n, s, i) => n + (s.value === sB[i]?.value && s.value > 0 ? 1 : 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-1">
        {LANGS.map(l => (
          <button
            key={l.id}
            onClick={() => setLang(l.id)}
            className={`text-[11px] px-3 py-1 rounded-full uppercase tracking-[0.08em] transition-colors ${
              lang === l.id ? 'bg-[#f5d680]/20 text-[#f5d680]' : 'text-[#9b9bbd] hover:text-[#e6e6f0]'
            }`}
          >{l.label}</button>
        ))}
      </div>

      <div className="bg-[#0c0c18] border border-white/10 rounded-xl p-6 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-5 items-center">
        <div className="space-y-2">
          <div className="text-[11px] italic uppercase tracking-[0.1em] text-[#9b9bbd] font-serif text-center">First word</div>
          <input
            type="text"
            value={a}
            onChange={e => setComp(e.target.value, b)}
            placeholder={langDef.placeholder}
            className="w-full bg-black/30 border border-white/10 rounded-md px-4 py-3 text-[20px] text-center text-[#e6e6f0] font-serif outline-none focus:border-[#d79b3a]/60"
            style={{ direction: rtl ? 'rtl' : 'ltr' }}
          />
        </div>
        <div className="font-serif italic text-[18px] tracking-[0.3em] text-[#f5d680]">VS</div>
        <div className="space-y-2">
          <div className="text-[11px] italic uppercase tracking-[0.1em] text-[#9b9bbd] font-serif text-center">Second word</div>
          <input
            type="text"
            value={b}
            onChange={e => setComp(a, e.target.value)}
            placeholder={langDef.placeholder}
            className="w-full bg-black/30 border border-white/10 rounded-md px-4 py-3 text-[20px] text-center text-[#e6e6f0] font-serif outline-none focus:border-[#d79b3a]/60"
            style={{ direction: rtl ? 'rtl' : 'ltr' }}
          />
        </div>
      </div>

      {(!a.trim() || !b.trim()) ? (
        <div className="text-center py-12 text-[#6d6d88] italic font-serif">
          <div className="text-4xl text-[#d79b3a]/50 mb-2">∞</div>
          Enter two words to find their hidden kinship.
        </div>
      ) : (
        <>
          {primA.value === primB.value && primA.value > 0 ? (
            <div className="bg-[#f5d680]/10 border border-[#f5d680]/40 rounded-lg p-4 text-center font-serif italic text-[#fff8dd]">
              Both words equal <strong className="not-italic text-[#f5d680]">{primA.value}</strong> in {primA.name} — by <em>gezera shava</em>, they share a hidden kinship.
            </div>
          ) : matchCount > 0 ? (
            <div className="bg-[#f5d680]/10 border border-[#f5d680]/40 rounded-lg p-4 text-center font-serif italic text-[#fff8dd]">
              {matchCount} system{matchCount > 1 ? 's' : ''} where these words share a value — kinship runs across the layers.
            </div>
          ) : null}

          <div className="bg-[#0c0c18] border border-[#d79b3a]/30 rounded-xl p-6 text-center">
            <div className="font-serif font-light text-[44px] text-[#f5d680] leading-none">{matchCount}</div>
            <div className="text-[12px] italic text-[#9b9bbd] font-serif mt-1">
              {matchCount === 0 ? 'no shared values · across all systems' : 'system' + (matchCount > 1 ? 's' : '') + ' where they meet'}
            </div>
            <div className="flex flex-wrap justify-center gap-8 mt-4 text-[12px] text-[#9b9bbd]">
              <Stat v={`${primA.value} + ${primB.value}`} l={`Sum = ${primA.value + primB.value}`} />
              <Stat v={`${primA.value} − ${primB.value}`} l={`Difference = ${Math.abs(primA.value - primB.value)}`} />
              <Stat v={primB.value !== 0 ? (primA.value / primB.value).toFixed(3) : '∞'} l="Ratio" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[[a, sA, primA], [b, sB, primB]].map(([word, sys, prim], idx) => {
              const r = reduceNumber(prim.value);
              return (
                <div key={idx} className="bg-[#0c0c18] border border-white/10 rounded-xl p-5">
                  <div className="text-center pb-3 border-b border-dashed border-white/10 mb-3">
                    <div className="text-[28px] text-[#f5d680] font-serif" style={{ direction: rtl ? 'rtl' : 'ltr' }}>{word}</div>
                    <div className="text-[12px] italic text-[#9b9bbd] font-serif mt-1">
                      {prim.name} = <strong className="not-italic text-[#f5d680]">{prim.value}</strong> · reduces to {r.final}{r.isMaster ? ' ✦' : ''}
                    </div>
                  </div>
                  {sys.map((s, i) => {
                    const otherVal = (idx === 0 ? sB : sA)[i]?.value || 0;
                    const isMatch = s.value === otherVal && s.value > 0;
                    return (
                      <div
                        key={s.name}
                        className={`flex justify-between items-baseline py-2 border-b border-dashed border-white/5 last:border-b-0 font-mono text-[13px] ${
                          isMatch ? 'text-[#f5d680] bg-[#f5d680]/[0.05]' : 'text-[#9b9bbd]'
                        }`}
                      >
                        <span className="font-serif italic text-[12px]">{s.name}</span>
                        <span className={`text-[15px] ${isMatch ? 'text-[#f5d680]' : 'text-[#fff8dd]'}`}>{s.value}{isMatch ? ' ✦' : ''}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ v, l }) {
  return (
    <div className="text-center">
      <div className="font-mono text-[18px] text-[#f5d680]">{v}</div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-[#6d6d88] font-serif italic mt-1">{l}</div>
    </div>
  );
}
