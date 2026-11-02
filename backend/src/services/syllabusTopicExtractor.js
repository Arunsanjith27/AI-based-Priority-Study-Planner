const cleanedLine = (line) => line
  .replace(/\r/g, '')
  .replace(/^\s*(?:[-*•]|\d+[.)]|[A-Z][).])\s*/, '')
  .replace(/\s+/g, ' ')
  .trim();

const isUsefulTopic = (line) => {
  const text = cleanedLine(line);
  if (!text || text.length < 3 || text.length > 160) return false;

  const lower = text.toLowerCase();
  if (/^(course|subject|department|semester|credit|hours?|references?|textbook|exam|assessment|objective|prerequisite)/.test(lower)) {
    return false;
  }

  return /[A-Za-z]/.test(text);
};

function extractSyllabusTopics(extractedText, subject) {
  if (!extractedText || !extractedText.trim()) return [];

  const lines = extractedText.split(/\n+/).map(cleanedLine).filter(isUsefulTopic);
  const headingPattern = /^(?:unit|module|chapter|topic)(?:\s+[\w.-]+)?(?:\s*[-:])?\s*/i;
  const candidates = [];

  for (const line of lines) {
    const raw = cleanedLine(line);
    if (headingPattern.test(raw) || /(?:^|\s)(?:unit|module|chapter)\s+\d+/i.test(raw)) {
      candidates.push(raw.replace(headingPattern, '').replace(/^[:\-.\s]+/, '').trim());
      continue;
    }

    if (/^[^.!?]{3,100}$/.test(raw) && candidates.length === 0 && raw !== subject) {
      candidates.push(raw);
    }
  }

  // TXT syllabi often use one topic per line. Keep short line content as a fallback.
  if (candidates.length === 0) {
    for (const line of lines.slice(0, 30)) {
      candidates.push(line);
    }
  }

  const unique = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const name = candidate.replace(/^[:\-.\s]+/, '').replace(/[;,.]+$/, '').trim();
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      unique.push(name);
    }
  }

  return unique.slice(0, 20);
}

module.exports = { extractSyllabusTopics };
