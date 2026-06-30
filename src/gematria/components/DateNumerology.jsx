// Gematria — date numerology mode.
// Pre-fills from the shared birth (if available); user can also pick any
// other date.

import React, { useState } from 'react';
import { useGematria } from '../store.js';
import {
  lifePath, birthdayNum, personalYear, universalYear, pinnacles, challenges,
  digitSum, NUMBER_MEANINGS,
} from '../compute/numberMeanings.js';

function birthToISO(b) {
  if (!b || !b.year) return '';
  return `${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`;
}

export default function DateNumerology() {
  const birth = useGematria(s => s.birth);
  const seedFromBirth = birthToISO(birth);
  const [date, setDate] = useState(seedFromBirth);

  if (!date) {
    return (
      <div className="space-y-6">
        <div className="bg-[#0c0c18] border border-white/10 rounded-lg p-6 text-center">
          <div className="text-[12px] italic text-[#9b9bbd] mb-3 font-serif">Choose a date — yours or anyone’s.</div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-black/30 border border-white/10 rounded-md px-5 py-3 text-[18px] font-serif text-[#e6e6f0]"
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <div className="text-center py-12 text-[#6d6d88] italic font-serif">
          <div className="text-4xl text-[#d79b3a]/50 mb-2">⚭</div>
          Choose your birth date to read its numerology.
        </div>
      </div>
    );
  }

  const [yyyy, mm, dd] = date.split('-').map(Number);
  if (!yyyy || !mm || !dd) {
    return <div className="text-center py-12 text-[#6d6d88] italic">Invalid date.</div>;
  }

  const lp   = lifePath(yyyy, mm, dd);
  const bday = birthdayNum(dd);
  const calY = new Date().getFullYear();
  const pY   = personalYear(mm, dd, calY);
  const uY   = universalYear(calY);
  const pins = pinnacles(yyyy, mm, dd);
  const chs  = challenges(yyyy, mm, dd);

  const dateLabel = `${String(dd).padStart(2,'0')}.${String(mm).padStart(2,'0')}.${yyyy}`;

  return (
    <div className="space-y-6">
      {/* Date picker */}
      <div className="flex justify-center items-center gap-4">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="bg-black/30 border border-white/10 rounded-md px-4 py-2 text-[16px] font-serif text-[#e6e6f0]"
          style={{ colorScheme: 'dark' }}
        />
        <div className="font-serif italic text-[#9b9bbd] text-[13px]">
          Reading the patterns of <strong className="not-italic text-[#f5d680]">{dateLabel}</strong>
        </div>
      </div>

      {/* Core numbers */}
      <SectionTitle>Core · numbers</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DateCard
          name="Life Path"
          value={lp.final}
          steps={`${lp.m} + ${lp.d} + ${lp.y} = ${lp.total}${lp.total !== lp.final ? ' → ' + lp.final : ''}${lp.isMaster ? ' ✦' : ''}`}
          meaning={NUMBER_MEANINGS[lp.final]}
          master={lp.isMaster}
        />
        <DateCard
          name="Birthday"
          value={bday.reduced}
          steps={`Day ${bday.raw}${bday.raw !== bday.reduced ? ' → ' + bday.reduced : ''}`}
          meaning={NUMBER_MEANINGS[bday.reduced]}
          master={[11,22,33].includes(bday.reduced)}
        />
        <DateCard
          name={`Personal Year ${calY}`}
          value={pY.final}
          steps={`M ${digitSum(mm)} + D ${digitSum(dd)} + Y ${digitSum(calY)} = ${pY.total} → ${pY.final}`}
          meaning={NUMBER_MEANINGS[pY.final]}
          master={[11,22,33].includes(pY.final)}
        />
      </div>

      <div className="text-center font-serif italic text-[#6d6d88] text-[13px]">
        The Universal Year {calY} reduces to <strong className="not-italic text-[#fff8dd]">{uY}</strong> — the collective tone everyone is breathing in.
      </div>

      {/* Pinnacles */}
      <SectionTitle>Pinnacles · the · four · cycles</SectionTitle>
      <div className="bg-[#0c0c18] border border-white/10 rounded-xl p-5">
        <div className="text-center font-serif italic text-[12px] text-[#9b9bbd] mb-3">
          Each Pinnacle is a season — the lessons and gifts of one stretch of life.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pins.map(p => (
            <PinnacleCell key={p.name} name={p.name} period={p.period} value={p.value} master={p.isMaster} />
          ))}
        </div>
      </div>

      {/* Challenges */}
      <SectionTitle>Challenges · the · opposing · forces</SectionTitle>
      <div className="bg-[#0c0c18] border border-white/10 rounded-xl p-5">
        <div className="text-center font-serif italic text-[12px] text-[#9b9bbd] mb-3">
          Challenges are what you are here to learn — never master numbers, only 0 through 8.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {chs.map(c => (
            <PinnacleCell key={c.name} name={c.name} period={c.period} value={c.value} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DateCard({ name, value, steps, meaning, master }) {
  return (
    <div className={`bg-[#0c0c18] border ${master ? 'border-[#ff6a6a]/50' : 'border-white/10'} rounded-xl p-5 text-center`}>
      <div className="text-[11px] italic uppercase tracking-[0.1em] text-[#fff8dd] font-serif mb-2">{name}</div>
      <div className={`font-serif font-light text-[56px] leading-none ${master ? 'text-[#ffd5dd]' : 'text-[#f5d680]'}`}>{value}</div>
      <div className="font-mono text-[10px] text-[#6d6d88] mt-2 tracking-wide">{steps}</div>
      {meaning && (
        <div className="mt-3 pt-3 border-t border-dashed border-white/10 font-serif italic text-[12px] text-[#9b9bbd] leading-snug">
          <div className="font-sans not-italic text-[10px] uppercase tracking-[0.15em] text-[#fff8dd] mb-1">{meaning.title}</div>
          {meaning.keywords}
        </div>
      )}
    </div>
  );
}

function PinnacleCell({ name, period, value, master }) {
  return (
    <div className={`flex items-center justify-between bg-black/20 rounded-lg px-4 py-3 border-l-2 ${master ? 'border-[#ff6a6a]' : 'border-[#d79b3a]'}`}>
      <div>
        <div className="font-serif italic text-[13px] text-[#9b9bbd]">{name}{master ? ' ✦' : ''}</div>
        <div className="font-mono text-[10px] text-[#6d6d88] mt-0.5">{period}</div>
      </div>
      <div className={`font-serif text-[28px] ${master ? 'text-[#ffd5dd]' : 'text-[#f5d680]'}`}>{value}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="font-serif text-[20px] text-[#e6e6f0] tracking-[0.05em] mb-1 flex items-center gap-4">
      <span className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <span className="italic text-[#fff8dd]">{children}</span>
      <span className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}
