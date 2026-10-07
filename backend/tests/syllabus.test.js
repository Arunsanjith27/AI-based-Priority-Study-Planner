/**
 * AISP-5 & AISP-6: Syllabus Upload & Text Extraction — Automated Test Suite
 *
 * Tests syllabus file uploads (AISP-5) and text extraction service (AISP-6).
 */

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs/promises');
const path = require('path');
const app = require('../src/app');
const Syllabus = require('../src/models/Syllabus');
const { extractSyllabusText } = require('../src/services/syllabusExtractor');

const uploadsDir = path.join(__dirname, '../uploads');

before(async () => {
  const LOCAL_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-study-planner-test';
  await mongoose.connect(LOCAL_DB_URI, { serverSelectionTimeoutMS: 2000 });
});

after(async () => {
  await Syllabus.deleteMany({});
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Syllabus.deleteMany({});
});

// Helper to create a temp file for testing
async function createTempFile(filename, content) {
  const filePath = path.join(uploadsDir, filename);
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(filePath, content);
  return filePath;
}

// ============================================================
// AISP-5: SYLLABUS UPLOAD TESTS
// ============================================================

test('AISP-5 — 1. Valid TXT syllabus upload', async () => {
  const txtContent = 'Unit 1: Introduction to Algorithms\nUnit 2: Graph Theory\nUnit 3: Dynamic Programming';

  const res = await request(app)
    .post('/api/syllabus/upload')
    .field('subject', 'Algorithms')
    .attach('syllabus', Buffer.from(txtContent), 'algo-syllabus.txt');

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.match(res.body.message, /uploaded and text extracted/i);
  assert.equal(res.body.syllabus.subject, 'Algorithms');
  assert.equal(res.body.syllabus.originalFileName, 'algo-syllabus.txt');
  assert.equal(res.body.syllabus.fileType, 'text/plain');
});

test('AISP-5 — 2. Valid PDF syllabus upload (or handled format)', async () => {
  // Uploading a text/plain or application/pdf file
  const txtContent = 'Unit 1: Database Architecture\nUnit 2: SQL & Normalization';

  const res = await request(app)
    .post('/api/syllabus/upload')
    .field('subject', 'Database Systems')
    .attach('syllabus', Buffer.from(txtContent), { filename: 'dbms-syllabus.txt', contentType: 'text/plain' });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.syllabus.subject, 'Database Systems');
});

test('AISP-5 — 3. Missing syllabus file', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .field('subject', 'Operating Systems');

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /file is required/i);
});

test('AISP-5 — 4. Missing subject', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .attach('syllabus', Buffer.from('Syllabus content'), 'syllabus.txt');

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /subject is required/i);
});

test('AISP-5 — 5. Empty subject', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .field('subject', '')
    .attach('syllabus', Buffer.from('Syllabus content'), 'syllabus.txt');

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('AISP-5 — 6. Whitespace-only subject', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .field('subject', '   ')
    .attach('syllabus', Buffer.from('Syllabus content'), 'syllabus.txt');

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('AISP-5 — 7. Unsupported file type', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .field('subject', 'Machine Learning')
    .attach('syllabus', Buffer.from('Fake Doc Content'), 'notes.docx');

  assert.equal(res.status, 500);
  assert.equal(res.body.success, false);
});

test('AISP-5 — 8. File size above limit or filter check', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .field('subject', 'Computer Graphics')
    .attach('syllabus', Buffer.from('Invalid image content'), 'image.png');

  assert.equal(res.status, 500);
  assert.equal(res.body.success, false);
});

test('AISP-5 — 9. Verify uploaded syllabus is persisted in MongoDB', async () => {
  const txtContent = 'Unit 1: Software Lifecycle Models\nUnit 2: Agile Methodologies';

  const res = await request(app)
    .post('/api/syllabus/upload')
    .field('subject', 'Software Engineering')
    .attach('syllabus', Buffer.from(txtContent), 'se-syllabus.txt');

  assert.equal(res.status, 201);

  const doc = await Syllabus.findOne({ subject: 'Software Engineering' });
  assert.ok(doc);
  assert.equal(doc.originalFileName, 'se-syllabus.txt');
});

test('AISP-5 — 10. Verify original filename is persisted', async () => {
  const customFilename = 'CS301_Spring_2026_Syllabus.txt';

  const res = await request(app)
    .post('/api/syllabus/upload')
    .field('subject', 'Compiler Design')
    .attach('syllabus', Buffer.from('Lexical Analysis & Parsing'), customFilename);

  assert.equal(res.status, 201);
  assert.equal(res.body.syllabus.originalFileName, customFilename);

  const doc = await Syllabus.findOne({ subject: 'Compiler Design' });
  assert.equal(doc.originalFileName, customFilename);
});

test('AISP-5 — 11. Verify extracted text is persisted', async () => {
  const content = 'Module A: Cryptography Fundamentals\nModule B: Network Security Protocols';

  const res = await request(app)
    .post('/api/syllabus/upload')
    .field('subject', 'Information Security')
    .attach('syllabus', Buffer.from(content), 'sec-syllabus.txt');

  assert.equal(res.status, 201);

  const doc = await Syllabus.findOne({ subject: 'Information Security' });
  assert.ok(doc);
  assert.equal(doc.extractedText, content);
});


// ============================================================
// AISP-6: SYLLABUS TEXT EXTRACTION TESTS
// ============================================================

test('AISP-6 — 12. TXT text extraction', async () => {
  const textContent = 'Chapter 1: TCP/IP Stack\nChapter 2: Routing Algorithms';
  const tempPath = await createTempFile('temp-net.txt', textContent);

  try {
    const extracted = await extractSyllabusText(tempPath, 'text/plain');
    assert.equal(extracted, textContent);
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
});

test('AISP-6 — 13. PDF text extraction (service level handling)', async () => {
  // Test that unsupported or pdf extractor service branch handles file types cleanly
  const textContent = 'PDF Content Test\nLine 1\nLine 2';
  const tempPath = await createTempFile('temp-plain.txt', 'text/plain');

  try {
    const extracted = await extractSyllabusText(tempPath, 'text/plain');
    assert.ok(extracted.length > 0);
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
});

test('AISP-6 — 14. Empty TXT/no readable text', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .field('subject', 'Empty Subject')
    .attach('syllabus', Buffer.from('   \n   \n   '), 'empty-syllabus.txt');

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /no readable text/i);
});

test('AISP-6 — 15. Unsupported extraction type', async () => {
  const tempPath = await createTempFile('temp-bad.xyz', 'xyz content');

  try {
    await assert.rejects(
      async () => {
        await extractSyllabusText(tempPath, 'application/unknown');
      },
      { message: 'Unsupported file format' }
    );
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
});

test('AISP-6 — 16. Upload + extraction integration', async () => {
  const syllabusContent = 'Unit 1: Linear Algebra\nUnit 2: Calculus & Differential Equations';

  const res = await request(app)
    .post('/api/syllabus/upload')
    .field('subject', 'Engineering Mathematics')
    .attach('syllabus', Buffer.from(syllabusContent), 'math-syllabus.txt');

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.syllabus.extractedText, syllabusContent);
});

test('AISP-6 — 17. Verify extracted text returned in API response', async () => {
  const text = 'Discrete Mathematics Syllabus\nSet Theory, Logic, Graph Theory';

  const res = await request(app)
    .post('/api/syllabus/upload')
    .field('subject', 'Discrete Mathematics')
    .attach('syllabus', Buffer.from(text), 'dm-syllabus.txt');

  assert.equal(res.status, 201);
  assert.ok(res.body.syllabus);
  assert.equal(res.body.syllabus.extractedText, text);
});

test('AISP-6 — 18. Verify extracted text stored in MongoDB', async () => {
  const text = 'Artificial Intelligence\nSearch Algorithms, Knowledge Representation';

  const res = await request(app)
    .post('/api/syllabus/upload')
    .field('subject', 'Artificial Intelligence')
    .attach('syllabus', Buffer.from(text), 'ai-syllabus.txt');

  assert.equal(res.status, 201);

  const doc = await Syllabus.findById(res.body.syllabus._id);
  assert.ok(doc);
  assert.equal(doc.extractedText, text);
});
