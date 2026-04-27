// Phase 7 — Test-mode runner UI.
//
// Full-screen modal accessed via #test hash or Cmd+Shift+T. Runs all
// suites sequentially and renders a results table. Click a failed
// suite to expand per-assertion errors.

import React, { useEffect, useState } from 'react';
import { runAll } from './framework.js';
import { SUITES } from './suites.js';

function pad(n, w) { return String(n).padStart(w, ' '); }

export default function TestRunner({ onClose }) {
  const [running, setRunning] = useState(true);
  const [report, setReport]   = useState({ suites: [], totals: { passed: 0, failed: 0, durationMs: 0 } });
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await runAll(SUITES, (_suiteDone, runningReport) => {
        if (!cancelled) setReport({ ...runningReport, suites: [...runningReport.suites] });
      });
      if (!cancelled) { setReport(r); setRunning(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const allSuites = SUITES.map(s => {
    const done = report.suites.find(r => r.name === s.name);
    return done || { name: s.name, results: [], durationMs: 0, pending: true };
  });

  const totalTests   = SUITES.reduce((n, s) => n + s.tests.length, 0);
  const passedSoFar  = report.totals.passed;
  const failedSoFar  = report.totals.failed;

  return (
    <div className="fixed inset-0 z-[70] bg-[#070710] text-[#e6e6f0] overflow-y-auto">
      <div className="max-w-[920px] mx-auto p-6">
        <header className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-serif text-[28px] tracking-[0.12em] text-[#f5d680]">
              Ology — Test Mode
            </h1>
            <p className="text-[12px] text-[#9b9bbd] mt-1">
              In-browser self-test. Each suite runs against the production build — Swiss WASM,
              stores, components, interpretations. {running ? 'Running…' : 'Finished.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#9b9bbd] hover:text-white px-3 py-1 border border-white/10 rounded text-[12px]"
          >Close</button>
        </header>

        <div className="bg-[#0c0c18] border border-white/10 rounded-md p-4 mb-4 flex items-baseline gap-5 text-[12px]">
          <div>
            <div className="text-[#6d6d88] text-[10px] tracking-[0.25em] uppercase">Passed</div>
            <div className="text-[#44ff88] text-[22px] font-mono">{passedSoFar}</div>
          </div>
          <div>
            <div className="text-[#6d6d88] text-[10px] tracking-[0.25em] uppercase">Failed</div>
            <div className={`text-[22px] font-mono ${failedSoFar ? 'text-[#ff6a6a]' : 'text-[#6d6d88]'}`}>{failedSoFar}</div>
          </div>
          <div>
            <div className="text-[#6d6d88] text-[10px] tracking-[0.25em] uppercase">Suites</div>
            <div className="text-[#e6e6f0] text-[22px] font-mono">{report.suites.length} / {SUITES.length}</div>
          </div>
          <div>
            <div className="text-[#6d6d88] text-[10px] tracking-[0.25em] uppercase">Total assertions</div>
            <div className="text-[#e6e6f0] text-[22px] font-mono">{passedSoFar + failedSoFar} / {totalTests}</div>
          </div>
          <div className="ml-auto">
            <div className="text-[#6d6d88] text-[10px] tracking-[0.25em] uppercase">Duration</div>
            <div className="text-[#e6e6f0] text-[22px] font-mono">{(report.totals.durationMs / 1000).toFixed(2)}s</div>
          </div>
        </div>

        <table className="w-full text-[12px] font-mono border-collapse">
          <tbody>
            {allSuites.map((s) => {
              const passed = s.results.filter(r => r.ok).length;
              const failed = s.results.filter(r => !r.ok).length;
              const state = s.pending ? 'pending' : failed ? 'failed' : 'passed';
              const stateGlyph = state === 'pending' ? '…' : state === 'failed' ? '✗' : '✓';
              const stateColor = state === 'pending' ? 'text-[#6d6d88]' : state === 'failed' ? 'text-[#ff6a6a]' : 'text-[#44ff88]';
              const total = SUITES.find(t => t.name === s.name)?.tests.length ?? s.results.length;
              const isOpen = !!expanded[s.name];
              const canExpand = failed > 0;
              return (
                <React.Fragment key={s.name}>
                  <tr
                    className={`border-t border-white/5 ${canExpand ? 'cursor-pointer hover:bg-white/[0.02]' : ''}`}
                    onClick={() => canExpand && setExpanded({ ...expanded, [s.name]: !isOpen })}
                  >
                    <td className={`py-2 pr-2 w-6 text-center ${stateColor}`}>{stateGlyph}</td>
                    <td className="py-2 pr-2 text-[#e6e6f0]">{s.name}</td>
                    <td className="py-2 pr-2 text-[#9b9bbd] text-right w-36">
                      {s.pending ? 'queued' : `${pad(passed, 3)} / ${pad(total, 3)} passed`}
                    </td>
                    <td className="py-2 pr-2 text-[#6d6d88] text-right w-20">
                      {s.pending ? '' : `${s.durationMs.toFixed(0)}ms`}
                    </td>
                  </tr>
                  {isOpen && failed > 0 && (
                    <tr>
                      <td></td>
                      <td colSpan={3} className="pb-3">
                        <div className="border-l border-[#ff6a6a]/40 pl-3 text-[11px] space-y-1">
                          {s.results.filter(r => !r.ok).map((r, i) => (
                            <div key={i}>
                              <span className="text-[#ff6a6a]">✗ {r.name}</span>
                              <div className="text-[#9b9bbd] ml-3">{r.error}</div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        <footer className="mt-6 text-[10px] text-[#6d6d88] flex items-center justify-between">
          <span>
            Keyboard: Esc to close · ⌘⇧T to reopen · also at <code>#test</code>
          </span>
          <span>
            {running ? 'Running…' : `Completed ${report.finished || ''}`}
          </span>
        </footer>
      </div>
    </div>
  );
}
