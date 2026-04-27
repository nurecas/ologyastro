// Phase 7 — Minimal in-browser test framework.
//
// Each suite exports `{ name, tests: [{ name, fn }] }`. `fn` can be sync
// or async; it throws on failure (Error.message is recorded) or returns
// normally on pass. `runAll(suites, onSuiteDone)` runs sequentially so
// Swiss state (set_sid_mode etc.) is deterministic.

export async function runAll(suites, onSuiteDone) {
  const report = {
    started: new Date().toISOString(),
    suites: [],
    totals: { passed: 0, failed: 0, durationMs: 0 },
  };
  for (const suite of suites) {
    const t0 = performance.now();
    const results = [];
    for (const t of suite.tests) {
      try {
        await t.fn();
        results.push({ name: t.name, ok: true });
        report.totals.passed++;
      } catch (e) {
        results.push({ name: t.name, ok: false, error: (e && e.message) || String(e) });
        report.totals.failed++;
      }
    }
    const entry = { name: suite.name, results, durationMs: performance.now() - t0 };
    report.suites.push(entry);
    report.totals.durationMs += entry.durationMs;
    if (onSuiteDone) onSuiteDone(entry, report);
  }
  report.finished = new Date().toISOString();
  return report;
}

// Tiny asserters — named so suite-authors don't need to import chai.
export function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
export function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
export function assertClose(a, b, tolerance, msg) {
  if (Math.abs(a - b) > tolerance) {
    throw new Error(msg || `expected ${b} ± ${tolerance}, got ${a} (|Δ| = ${Math.abs(a - b)})`);
  }
}
export function assertDefined(v, msg) {
  if (v === undefined || v === null) throw new Error(msg || 'expected defined value');
}
