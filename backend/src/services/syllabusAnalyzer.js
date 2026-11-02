/**
 * AI Syllabus Analysis service.
 *
 * Uses a locally-hosted Ollama model (default: Qwen2.5 Instruct) to convert
 * raw syllabus text into a structured study outline that fits the Semester
 * `subjectSchema` (name, code, credits, topics[]).
 *
 * Why Ollama + structured outputs:
 * - Fully local & free: no external API keys, no per-call cost, no data leaves
 *   the machine.
 * - Ollama's `format` option accepts a JSON Schema, which constrains the model
 *   to emit valid JSON matching the exact shape we need — no fragile prose
 *   parsing. (This is why Qwen2.5-instruct is preferred over Qwen3, whose
 *   "thinking" tokens would complicate structured extraction.)
 *
 * Configuration (read at call time so tests can override OLLAMA_HOST):
 *   OLLAMA_HOST   default http://localhost:11434
 *   OLLAMA_MODEL   default qwen2.5:7b-instruct  (use qwen2.5:3b-instruct on lighter machines)
 *   OLLAMA_TIMEOUT default 120000 (ms)
 */

// ── Schema constraints (mirror backend/src/models/Semester.js subjectSchema) ──
const TOPIC_NAME_MAX = 200;
const SUBJECT_NAME_MAX = 200;
const CODE_MAX = 20;
const CREDITS_MIN = 0.5;
const CREDITS_MAX = 20;
const DEFAULT_CREDITS = 3;
const MAX_TOPICS = 200;
// Keep prompt manageable for very large syllabi (head + tail).
const MAX_INPUT_CHARS = 60000;

const DEFAULT_OLLAMA_HOST = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen2.5:7b-instruct';
const DEFAULT_TIMEOUT_MS = 120000;

/**
 * JSON Schema handed to Ollama's `format` option. The model is constrained to
 * produce an object matching this schema, so `message.content` parses cleanly.
 */
const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    subjectName: { type: 'string' },
    code: { type: 'string' },
    credits: { type: 'number' },
    topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
    },
  },
  required: ['subjectName', 'topics'],
};

/**
 * Typed error so the controller can map codes to HTTP statuses without
 * inspecting message strings.
 */
class SyllabusAnalysisError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'SyllabusAnalysisError';
    this.code = code;
  }
}

function buildSystemPrompt() {
  return [
    'You are a syllabus-analysis assistant for a student study planner.',
    'Given the raw extracted text of a single course syllabus, produce a structured study outline.',
    '',
    'Return ONLY a JSON object with this exact shape:',
    '{',
    '  "subjectName": string,   // the course / subject name; use the provided subject if given, else infer from the syllabus',
    '  "code": string,           // course code if present (e.g. "CS201"), otherwise ""',
    '  "credits": number,        // credit hours if present, a number from 0.5 to 20; omit if unknown',
    '  "topics": [ { "name": string } ]  // ordered list of study topics, general to specific',
    '}',
    '',
    'Rules:',
    '- "topics" MUST be a non-empty array and each "name" MUST be a concise non-empty string (max 200 chars).',
    '- Derive topics from units / modules / chapters / weeks / sections. If the syllabus uses nested structure, flatten it into a single ordered list.',
    '- Include ONLY the topic name — no descriptions, no numbering prefixes, no extra fields.',
    '- Output valid JSON only. No prose, no markdown, no code fences.',
  ].join('\n');
}

function cleanString(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function clampCredits(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  // Round to the nearest 0.5 to match typical credit-hour granularity.
  const rounded = Math.round(n * 2) / 2;
  return Math.min(CREDITS_MAX, Math.max(CREDITS_MIN, rounded));
}

/**
 * Coerce the model's raw output into the exact shape `addSubject` expects,
 * defending against the model returning strings, numbers, or extra fields.
 */
function normalizeAnalysis(raw, fallbackSubject) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new SyllabusAnalysisError(
      'AI returned an invalid analysis result.',
      'INVALID_OUTPUT'
    );
  }

  const subjectName =
    cleanString(raw.subjectName, SUBJECT_NAME_MAX) ||
    cleanString(fallbackSubject, SUBJECT_NAME_MAX);

  const code = cleanString(raw.code, CODE_MAX);

  let credits = clampCredits(raw.credits);
  if (credits === null) credits = DEFAULT_CREDITS;

  const rawTopics = Array.isArray(raw.topics) ? raw.topics : [];
  let topics = rawTopics
    .map((t) => (typeof t === 'string' ? t : t && t.name))
    .map((name) => cleanString(name, TOPIC_NAME_MAX))
    .filter((name) => name.length > 0);

  // De-duplicate case-insensitively while preserving order.
  const seen = new Set();
  topics = topics.filter((name) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  topics = topics.slice(0, MAX_TOPICS).map((name) => ({ name }));

  if (topics.length === 0) {
    throw new SyllabusAnalysisError(
      'AI analysis could not extract any topics from the syllabus text.',
      'NO_TOPICS'
    );
  }
  if (!subjectName) {
    throw new SyllabusAnalysisError(
      'AI analysis could not determine a subject name.',
      'NO_SUBJECT'
    );
  }

  return { subjectName, code, credits, topics };
}

/**
 * Truncate very long syllabus text, keeping the head and tail so course
 * outlines (often at the start) and grading/schedule (often at the end) are
 * both retained.
 */
function truncateForPrompt(text, max = MAX_INPUT_CHARS) {
  if (text.length <= max) return text;
  const head = text.slice(0, Math.floor(max * 0.7));
  const tail = text.slice(text.length - Math.floor(max * 0.3));
  return `${head}\n\n…[content truncated]…\n\n${tail}`;
}

async function callOllama(extractedText, subjectName) {
  const base = (
    process.env.OLLAMA_HOST ||
    DEFAULT_OLLAMA_HOST
  ).replace(/\/$/, '');
  const model = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
  const timeoutMs =
    Number(process.env.OLLAMA_TIMEOUT) || DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        format: ANALYSIS_SCHEMA,
        options: { temperature: 0.2 },
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          {
            role: 'user',
            content:
              `Subject (if known): ${subjectName || '(unknown)'}\n\n` +
              `Syllabus text:\n"""\n${truncateForPrompt(extractedText)}\n"""`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (res.status === 404) {
      throw new SyllabusAnalysisError(
        'The Ollama chat endpoint was not found. Check that OLLAMA_HOST points to a running Ollama server.',
        'OLLAMA_NOT_FOUND'
      );
    }
    if (!res.ok) {
      let detail = '';
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
      throw new SyllabusAnalysisError(
        `The AI model request failed (HTTP ${res.status}). ${String(detail).slice(0, 200)}`,
        'OLLAMA_HTTP_ERROR'
      );
    }

    const data = await res.json();
    const content = data && data.message && data.message.content;
    if (!content || !String(content).trim()) {
      throw new SyllabusAnalysisError(
        'The AI model returned an empty response.',
        'OLLAMA_EMPTY'
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new SyllabusAnalysisError(
        'The AI model returned a response that was not valid JSON.',
        'OLLAMA_BAD_JSON'
      );
    }
    return parsed;
  } catch (err) {
    if (err instanceof SyllabusAnalysisError) throw err;
    if (err.name === 'AbortError') {
      throw new SyllabusAnalysisError(
        'AI analysis timed out. The model may still be loading — try again in a moment.',
        'TIMEOUT'
      );
    }
    // Node fetch throws a TypeError with cause ECONNREFUSED/ENOTFOUND when the
    // server is down; surface a clear, actionable message.
    const code = (err && err.cause && err.cause.code) || err.code;
    if (
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN' ||
      err.name === 'TypeError'
    ) {
      throw new SyllabusAnalysisError(
        'Could not reach the local AI server. Make sure Ollama is running (`ollama serve`) and the model is pulled (`ollama pull ' +
          (process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL) +
          '`).',
        'OLLAMA_UNREACHABLE'
      );
    }
    throw new SyllabusAnalysisError(
      'An unexpected error occurred while contacting the AI model.',
      'OLLAMA_UNKNOWN'
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Analyze extracted syllabus text into a structured subject outline.
 *
 * @param {string} extractedText - raw text previously extracted from the file.
 * @param {string} [subjectName] - the subject name supplied at upload time.
 * @returns {Promise<{subjectName:string, code:string, credits:number, topics:Array<{name:string}>, model:string}>}
 */
async function analyzeSyllabus(extractedText, subjectName) {
  const text = (extractedText || '').trim();
  if (!text) {
    throw new SyllabusAnalysisError(
      'No syllabus text was provided for analysis.',
      'NO_TEXT'
    );
  }

  const raw = await callOllama(text, subjectName);
  const normalized = normalizeAnalysis(raw, subjectName);
  return {
    ...normalized,
    model: process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
  };
}

module.exports = {
  analyzeSyllabus,
  SyllabusAnalysisError,
  ANALYSIS_SCHEMA,
  // exported for unit testing of the normalization layer
  normalizeAnalysis,
};
