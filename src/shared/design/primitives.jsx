// Ology — shared UI primitives.
// Every personal entry should compose its UI out of these — keeps the visual
// grammar identical across systems (Western, Vedic, HD, Chinese, Gematria).

import React from 'react';

export function Pill({ active, onClick, children, title, as: Tag = 'button', ...rest }) {
  return (
    <Tag
      onClick={onClick}
      title={title}
      className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
        active
          ? 'bg-[#f5d680]/10 border-[#f5d680]/50 text-[#f5d680]'
          : 'bg-transparent border-white/15 text-[#9b9bbd] hover:text-[#e6e6f0]'
      }`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function Toggle({ on, onClick, ariaLabel }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      aria-label={ariaLabel}
      className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${
        on ? 'bg-[#f5d680]/80 justify-end' : 'bg-white/10 justify-start'
      }`}
    >
      <span className="w-4 h-4 rounded-full bg-[#080810]" />
    </button>
  );
}

export function Field({ label, sub, span = 'col-span-3', children }) {
  return (
    <div className={span}>
      <div className="text-[11px] tracking-[0.2em] uppercase text-[#9b9bbd] mb-1">{label}</div>
      {children}
      {sub && <div className="text-[10px] text-[#6d6d88] mt-1">{sub}</div>}
    </div>
  );
}

export function SectionTitle({ children }) {
  return <div className="text-[11px] tracking-[0.25em] uppercase text-[#9b9bbd] mb-2">{children}</div>;
}

export function Card({ variant = 'default', className = '', children, ...rest }) {
  const v = variant === 'accent'
    ? 'bg-[#0c0c18] border-[#f5d680]/40'
    : variant === 'master'
    ? 'bg-[#0c0c18] border-[#ff6a6a]/40'
    : 'bg-[#0c0c18] border-white/10';
  return (
    <div className={`border ${v} rounded-md ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function GhostButton({ active, onClick, children, title, className = '' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`btn-ghost ${active ? 'active' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
