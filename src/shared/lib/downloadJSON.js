// Ology — JSON download helpers (raw + LLM-flavoured).
// Each system supplies its own prompt, chart payload and schema; this module
// just wraps the common envelope and triggers a browser download.

const FORMAT = 'ology-llm-v1';

function slug(s) {
  return (s || 'chart').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase();
}

function todayISO() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function triggerDownload(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Raw chart export — for portability, JSON-import round-trips, etc.
export function downloadRawJson({ name, system, payload }) {
  const text = JSON.stringify({ format: 'ology-raw-v1', system, ...payload }, null, 2);
  triggerDownload(`${slug(name)}__${system}__${todayISO()}.raw.json`, text);
}

// LLM-flavoured export — bakes a prompt the user can drop into any LLM along
// with the data. Adds an optional `userFocus` line that lets the user steer
// the reading (e.g. "focus on relationships").
export function downloadLLMJson({ name, system, prompt, schema, chart, birth, userFocus, ologyVersion = '0.2.0' }) {
  const payload = {
    format: FORMAT,
    system,
    generated_at: new Date().toISOString(),
    ology_version: ologyVersion,
    instructions: 'Drop this entire file into an LLM (Claude, ChatGPT, Gemini, etc.) and ask for a reading. The `prompt` field tells the model what to do; `chart` holds the data; `schema` describes every field.',
    prompt,
    user_focus: userFocus || null,
    birth: birth || null,
    chart,
    schema,
    notes: [
      'Computed offline — no analytics, no server, no network.',
      'All interpretation should be grounded in the data above; do not invent positions, transits, or events.',
    ],
  };
  const text = JSON.stringify(payload, null, 2);
  triggerDownload(`${slug(name)}__${system}__${todayISO()}.ology.json`, text);
}

// Variant: copy the LLM JSON to the clipboard instead of downloading. For
// users who'd rather paste than drag-and-drop.
export async function copyLLMJsonToClipboard(opts) {
  const text = JSON.stringify(buildLLMPayload(opts), null, 2);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function buildLLMPayload({ system, prompt, schema, chart, birth, userFocus, ologyVersion = '0.2.0' }) {
  return {
    format: FORMAT,
    system,
    generated_at: new Date().toISOString(),
    ology_version: ologyVersion,
    prompt,
    user_focus: userFocus || null,
    birth: birth || null,
    chart,
    schema,
  };
}
