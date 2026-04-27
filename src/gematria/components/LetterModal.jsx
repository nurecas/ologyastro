import React, { useEffect } from 'react';
import { useGematria } from '../store.js';
import { getLetterLore } from '../compute/letterLore.js';
import { letterAllValues } from '../compute/calculate.js';

export default function LetterModal() {
  const modal = useGematria(s => s.letterModal);
  const close = useGematria(s => s.closeLetterModal);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, close]);

  if (!modal) return null;
  const lore = getLetterLore(modal.letter, modal.lang);
  if (!lore) return null;
  const values = letterAllValues(modal.letter, modal.lang);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-[520px] bg-[#0c0c18] border border-[#f5d680]/40 rounded-2xl p-9 text-center shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={close}
          className="absolute right-4 top-3 text-[#9b9bbd] hover:text-[#f5d680] text-2xl leading-none"
          aria-label="Close"
        >×</button>
        <div className="text-[80px] leading-none text-[#f5d680] mb-3 font-serif">{modal.letter}</div>
        <div className="text-[24px] font-serif text-[#e6e6f0] mb-1">{lore.name}</div>
        <div className="font-serif italic text-[14px] text-[#fff8dd] mb-4">{lore.symbol}</div>
        <div className="inline-block px-3 py-1 rounded-full border border-[#b79aff]/40 bg-[#b79aff]/10 text-[10px] tracking-[0.18em] uppercase text-[#d8caff] mb-4">
          {lore.correspondence}
        </div>
        <div className="font-mono text-[13px] text-[#f5d680] mb-4 px-3 py-2 bg-black/30 rounded-md">
          {values.map(([n, v], i) => (
            <span key={i}>
              <span className="text-[#9b9bbd] text-[10px] tracking-wider">{n.toUpperCase()}</span>{' '}
              <strong className="text-[#f5d680]">{v}</strong>
              {i < values.length - 1 ? '  ·  ' : ''}
            </span>
          ))}
        </div>
        <div className="text-left font-serif italic text-[14px] text-[#9b9bbd] leading-relaxed">
          {lore.body}
        </div>
      </div>
    </div>
  );
}
