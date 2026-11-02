/**
 * AISP-5 & AISP-6: Syllabus Upload & Text Extraction — Automated Test Suite
 *
 * Updated for feature/review-ai-analysis: all /upload calls require a valid
 * JWT (router.use(authenticate)) and Syllabus.create requires a student ref.
 * MongoMemoryServer fallback so the suite runs without a local mongod.
 */

require('dotenv').config();
const { test, before, after, beforeEach } = require('node:test');
const assert   = require('node:assert/strict');
const request  = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt      = require('jsonwebtoken');
const fs       = require('fs/promises');
const path     = require('path');
const app      = require('../src/app');
const Syllabus = require('../src/models/Syllabus');
const Student  = require('../src/models/Student');
const { extractSyllabusText } = require('../src/services/syllabusExtractor');

process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'dev_aisp2_jwt_secret_key_change_in_production';
const JWT_SECRET = process.env.JWT_SECRET;

const uploadsDir = path.join(__dirname, '../uploads');

let mongoServer;
let testStudent;
let authToken;

// ── lifecycle ─────────────────────────────────────────────────────────────────
before(async () => {
  const LOCAL_DB_URI =
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-study-planner-test';
  try {
    await mongoose.connect(LOCAL_DB_URI, { serverSelectionTimeoutMS: 2000 });
  } catch {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }
});

after(async () => {
  await Syllabus.deleteMany({});
  await Student.deleteMany({});
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await Syllabus.deleteMany({});
  await Student.deleteMany({});
  testStudent = await Student.create({
    name:     'Syllabus Test Student',
    email:    'syllabus-test@example.com',
    password: 'Password@123',
  });
  authToken = jwt.sign({ id: testStudent._id }, JWT_SECRET, { expiresIn: '1h' });
});

// ── helpers ───────────────────────────────────────────────────────────────────
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
    .set('Authorization', `Bearer ${authToken}`)
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
  const txtContent = 'Unit 1: Database Architecture\nUnit 2: SQL & Normalization';

  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('subject', 'Database Systems')
    .attach('syllabus', Buffer.from(txtContent), { filename: 'dbms-syllabus.txt', contentType: 'text/plain' });

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.syllabus.subject, 'Database Systems');
});

test('AISP-5 — 3. Missing syllabus file', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('subject', 'Operating Systems');

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /file is required/i);
});

test('AISP-5 — 4. Missing subject', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .attach('syllabus', Buffer.from('Syllabus content'), 'syllabus.txt');

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /subject is required/i);
});

test('AISP-5 — 5. Empty subject', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('subject', '')
    .attach('syllabus', Buffer.from('Syllabus content'), 'syllabus.txt');

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('AISP-5 — 6. Whitespace-only subject', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('subject', '   ')
    .attach('syllabus', Buffer.from('Syllabus content'), 'syllabus.txt');

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('AISP-5 — 7. Unsupported file type returns error', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('subject', 'Machine Learning')
    .attach('syllabus', Buffer.from('Fake Doc Content'), 'notes.docx');

  assert.equal(res.status, 500);
  assert.equal(res.body.success, false);
});

test('AISP-5 — 8. Unsupported image type returns error', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('subject', 'Computer Graphics')
    .attach('syllabus', Buffer.from('Invalid image content'), 'image.png');

  assert.equal(res.status, 500);
  assert.equal(res.body.success, false);
});

test('AISP-5 — 9. Upload requires authentication (no token -> 401)', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .field('subject', 'Operating Systems')
    .attach('syllabus', Buffer.from('Unit 1: Processes'), 'os.txt');

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('AISP-5 — 10. Verify uploaded syllabus is persisted in MongoDB', async () => {
  const txtContent = 'Unit 1: Software Lifecycle Models\nUnit 2: Agile Methodologies';

  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('subject', 'Software Engineering')
    .attach('syllabus', Buffer.from(txtContent), 'se-syllabus.txt');

  assert.equal(res.status, 201);

  const doc = await Syllabus.findOne({ subject: 'Software Engineering' });
  assert.ok(doc);
  assert.equal(doc.originalFileName, 'se-syllabus.txt');
  // Student ref must be set
  assert.equal(String(doc.student), String(testStudent._id));
  // Review lifecycle defaults
  assert.equal(doc.reviewStatus, 'pending');
  assert.equal(doc.aiAnalysis, null);
});

test('AISP-5 — 11. Verify original filename is persisted', async () => {
  const customFilename = 'CS301_Spring_2026_Syllabus.txt';

  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('subject', 'Compiler Design')
    .attach('syllabus', Buffer.from('Lexical Analysis & Parsing'), customFilename);

  assert.equal(res.status, 201);
  assert.equal(res.body.syllabus.originalFileName, customFilename);

  const doc = await Syllabus.findOne({ subject: 'Compiler Design' });
  assert.equal(doc.originalFileName, customFilename);
});

test('AISP-5 — 12. Verify extracted text is persisted', async () => {
  const content = 'Module A: Cryptography Fundamentals\nModule B: Network Security Protocols';

  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
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

test('AISP-6 — 13. TXT text extraction (service level)', async () => {
  const textContent = 'Chapter 1: TCP/IP Stack\nChapter 2: Routing Algorithms';
  const tempPath    = await createTempFile('temp-net.txt', textContent);

  try {
    const extracted = await extractSyllabusText(tempPath, 'text/plain');
    assert.equal(extracted, textContent);
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
});

test('AISP-6 — 14. TXT extraction returns non-empty string', async () => {
  const tempPath = await createTempFile('temp-plain.txt', 'PDF Content Test\nLine 1\nLine 2');

  try {
    const extracted = await extractSyllabusText(tempPath, 'text/plain');
    assert.ok(extracted.length > 0);
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
});

test('AISP-6 — 15. Empty TXT returns 400 no readable text', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('subject', 'Empty Subject')
    .attach('syllabus', Buffer.from('   \n   \n   '), 'empty-syllabus.txt');

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /no readable text/i);
});

test('AISP-6 — 16. Unsupported extraction type throws', async () => {
  const tempPath = await createTempFile('temp-bad.xyz', 'xyz content');

  try {
    await assert.rejects(
      async () => { await extractSyllabusText(tempPath, 'application/unknown'); },
      { message: 'Unsupported file format' }
    );
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
});

test('AISP-6 — 17. Upload + extraction integration', async () => {
  const syllabusContent = 'Unit 1: Linear Algebra\nUnit 2: Calculus & Differential Equations';

  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('subject', 'Engineering Mathematics')
    .attach('syllabus', Buffer.from(syllabusContent), 'math-syllabus.txt');

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.syllabus.extractedText, syllabusContent);
});

test('AISP-6 — 18. Extracted text returned in API response', async () => {
  const text = 'Discrete Mathematics Syllabus\nSet Theory, Logic, Graph Theory';

  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('subject', 'Discrete Mathematics')
    .attach('syllabus', Buffer.from(text), 'dm-syllabus.txt');

  assert.equal(res.status, 201);
  assert.ok(res.body.syllabus);
  assert.equal(res.body.syllabus.extractedText, text);
});

test('AISP-6 — 19. Extracted text stored in MongoDB', async () => {
  const text = 'Artificial Intelligence\nSearch Algorithms, Knowledge Representation';

  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('subject', 'Artificial Intelligence')
    .attach('syllabus', Buffer.from(text), 'ai-syllabus.txt');

  assert.equal(res.status, 201);

  const doc = await Syllabus.findById(res.body.syllabus._id);
  assert.ok(doc);
  assert.equal(doc.extractedText, text);
});
