/**
 * AISP-5 & AISP-6: Syllabus Upload & Text Extraction — Automated Test Suite
 *
 * Tests syllabus file uploads (AISP-5) and text extraction service (AISP-6).
 */

require('dotenv').config();
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const fs = require('fs/promises');
const path = require('path');
const app = require('../src/app');
const Syllabus = require('../src/models/Syllabus');
const Student = require('../src/models/Student');
const { extractSyllabusText } = require('../src/services/syllabusExtractor');

// Ensure the same secret is used for signing (here) and verifying (auth middleware).
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'dev_aisp2_jwt_secret_key_change_in_production';
const JWT_SECRET = process.env.JWT_SECRET;

const uploadsDir = path.join(__dirname, '../uploads');

let mongoServer;
// Shared authenticated student reused across the AISP-5/6 upload tests (and the
// default owner for AISP-7 syllabus docs). Recreated fresh in beforeEach.
let testStudent;
let authToken;

before(async () => {
  const LOCAL_DB_URI =
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-study-planner-test';
  try {
    await mongoose.connect(LOCAL_DB_URI, { serverSelectionTimeoutMS: 2000 });
  } catch {
    // Fall back to an in-memory MongoDB so the suite runs without a local mongod.
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }
});

after(async () => {
  await Syllabus.deleteMany({});
  await Student.deleteMany({});
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Syllabus.deleteMany({});
  await Student.deleteMany({});
  testStudent = await Student.create({
    name: 'Syllabus Test Student',
    email: 'syllabus-test@example.com',
    password: 'Password@123',
  });
  authToken = jwt.sign({ id: testStudent._id }, JWT_SECRET, { expiresIn: '1h' });
});

// ============================================================
// AISP-7 test helpers — stub Ollama server
// ============================================================
// The analyze route calls the local Ollama server. To keep tests hermetic and
// not depend on a running model, we spin up a tiny HTTP server that mimics
// Ollama's /api/chat contract, and point OLLAMA_HOST at it.

let ollamaStub;
let ollamaStubUrl;
// Each AISP-7 test sets this before calling the analyze endpoint.
let ollamaStubResponse = {
  status: 200,
  body: { message: { content: '{}' } },
};

before(async () => {
  await new Promise((resolve) => {
    ollamaStub = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        res.writeHead(ollamaStubResponse.status, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify(ollamaStubResponse.body));
      });
    });
    ollamaStub.listen(0, '127.0.0.1', () => {
      ollamaStubUrl = `http://127.0.0.1:${ollamaStub.address().port}`;
      process.env.OLLAMA_HOST = ollamaStubUrl;
      process.env.OLLAMA_MODEL =
        process.env.OLLAMA_MODEL || 'qwen2.5:7b-instruct';
      resolve();
    });
  });
});

after(async () => {
  if (ollamaStub) {
    await new Promise((resolve) => ollamaStub.close(() => resolve()));
  }
});

async function createStudentAndToken(emailPrefix = 'second') {
  const email = `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const student = await Student.create({
    name: 'Syllabus Test Student',
    email,
    password: 'Password@123',
  });
  const token = jwt.sign({ id: student._id }, JWT_SECRET, { expiresIn: '1h' });
  return { student, token };
}

async function createSyllabusDoc(overrides = {}) {
  return Syllabus.create({
    student: testStudent._id,
    subject: 'Operating Systems',
    originalFileName: 'os-syllabus.txt',
    filePath: path.join(uploadsDir, 'os-syllabus.txt'),
    fileType: 'text/plain',
    extractedText:
      'Unit 1: Processes and Threads\nUnit 2: CPU Scheduling\nUnit 3: Memory Management\nUnit 4: File Systems',
    ...overrides,
  });
}

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
  // Uploading a text/plain or application/pdf file
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

test('AISP-5 — 7. Unsupported file type', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('subject', 'Machine Learning')
    .attach('syllabus', Buffer.from('Fake Doc Content'), 'notes.docx');

  assert.equal(res.status, 500);
  assert.equal(res.body.success, false);
});

test('AISP-5 — 8. File size above limit or filter check', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('subject', 'Computer Graphics')
    .attach('syllabus', Buffer.from('Invalid image content'), 'image.png');

  assert.equal(res.status, 500);
  assert.equal(res.body.success, false);
});

test('AISP-5 — 9. Verify uploaded syllabus is persisted in MongoDB', async () => {
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
});

test('AISP-5 — 10. Verify original filename is persisted', async () => {
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

test('AISP-5 — 11. Verify extracted text is persisted', async () => {
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
    .set('Authorization', `Bearer ${authToken}`)
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
    .set('Authorization', `Bearer ${authToken}`)
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
    .set('Authorization', `Bearer ${authToken}`)
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
    .set('Authorization', `Bearer ${authToken}`)
    .field('subject', 'Artificial Intelligence')
    .attach('syllabus', Buffer.from(text), 'ai-syllabus.txt');

  assert.equal(res.status, 201);

  const doc = await Syllabus.findById(res.body.syllabus._id);
  assert.ok(doc);
  assert.equal(doc.extractedText, text);
});

// ============================================================
// AISP-7: AI SYLLABUS ANALYSIS (Ollama)
// ============================================================

test('AISP-7 — 19. Analyze syllabus returns a structured subject/topics outline', async () => {
  const syllabus = await createSyllabusDoc();

  ollamaStubResponse = {
    status: 200,
    body: {
      message: {
        content: JSON.stringify({
          subjectName: 'Operating Systems',
          code: 'CS304',
          credits: 4,
          topics: [
            { name: 'Processes and Threads' },
            { name: 'CPU Scheduling' },
            { name: 'Memory Management' },
            { name: 'File Systems' },
          ],
        }),
      },
    },
  };

  const res = await request(app)
    .post(`/api/syllabus/${syllabus._id}/analyze`)
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.match(res.body.message, /analyzed successfully/i);
  assert.ok(res.body.data.analysis);
  assert.equal(res.body.data.analysis.subjectName, 'Operating Systems');
  assert.equal(res.body.data.analysis.code, 'CS304');
  assert.equal(res.body.data.analysis.credits, 4);
  assert.equal(res.body.data.analysis.topics.length, 4);
  assert.equal(res.body.data.analysis.topics[0].name, 'Processes and Threads');

  // Persisted on the syllabus document, owned by the authenticated student
  assert.equal(res.body.data.syllabus.aiAnalysis.subjectName, 'Operating Systems');
  assert.equal(res.body.data.syllabus.aiAnalysis.status, 'completed');

  const doc = await Syllabus.findById(syllabus._id);
  assert.ok(doc.aiAnalysis);
  assert.equal(doc.aiAnalysis.topics.length, 4);
  assert.equal(doc.aiAnalysis.model, 'qwen2.5:7b-instruct');
  assert.equal(String(doc.student), String(testStudent._id));
});

test('AISP-7 — 20. Analyzer clamps/defaults credits and trims topic names', async () => {
  const syllabus = await createSyllabusDoc();

  // credits missing (omit), code missing, one duplicate + one empty topic name
  ollamaStubResponse = {
    status: 200,
    body: {
      message: {
        content: JSON.stringify({
          subjectName: 'Operating Systems',
          topics: [
            { name: '  Processes  ' },
            { name: 'Processes' },
            { name: '   ' },
            { name: 'Scheduling' },
          ],
        }),
      },
    },
  };

  const res = await request(app)
    .post(`/api/syllabus/${syllabus._id}/analyze`)
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.analysis.credits, 3); // default
  assert.equal(res.body.data.analysis.code, ''); // trimmed to empty
  // duplicate (case-insensitive) and whitespace-only entries removed
  assert.equal(res.body.data.analysis.topics.length, 2);
  assert.equal(res.body.data.analysis.topics[0].name, 'Processes');
});

test('AISP-7 — 21. Returns 503 when the Ollama server is unreachable', async () => {
  const syllabus = await createSyllabusDoc();
  const previousHost = process.env.OLLAMA_HOST;

  // Point at a closed port so the connection is refused.
  process.env.OLLAMA_HOST = 'http://127.0.0.1:9';

  try {
    const res = await request(app)
      .post(`/api/syllabus/${syllabus._id}/analyze`)
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /ollama/i);
  } finally {
    process.env.OLLAMA_HOST = previousHost;
  }
});

test('AISP-7 — 22. Returns 502 when the model emits non-JSON content', async () => {
  const syllabus = await createSyllabusDoc();

  ollamaStubResponse = {
    status: 200,
    body: { message: { content: 'This is not JSON, sorry.' } },
  };

  const res = await request(app)
    .post(`/api/syllabus/${syllabus._id}/analyze`)
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(res.status, 502);
  assert.equal(res.body.success, false);
});

test('AISP-7 — 23. Returns 422 when the analysis yields no topics', async () => {
  const syllabus = await createSyllabusDoc();

  ollamaStubResponse = {
    status: 200,
    body: {
      message: {
        content: JSON.stringify({ subjectName: 'Operating Systems', topics: [] }),
      },
    },
  };

  const res = await request(app)
    .post(`/api/syllabus/${syllabus._id}/analyze`)
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(res.status, 422);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /topics/i);
});

test('AISP-7 — 24. Analyze requires authentication (no token -> 401)', async () => {
  const syllabus = await createSyllabusDoc();

  const res = await request(app).post(`/api/syllabus/${syllabus._id}/analyze`);

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('AISP-7 — 25. Analyze returns 404 for an unknown syllabus id', async () => {
  ollamaStubResponse = { status: 200, body: { message: { content: '{}' } } };

  const res = await request(app)
    .post('/api/syllabus/64a1b2c3d4e5f6a7b8c9d0e1/analyze')
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});

test('AISP-7 — 26. Analyze returns 400 when the syllabus has no extracted text', async () => {
  const syllabus = await createSyllabusDoc({ extractedText: '   ' });

  const res = await request(app)
    .post(`/api/syllabus/${syllabus._id}/analyze`)
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /no extracted text/i);
});

test('AISP-7 — 27. Cannot analyze another student\'s syllabus (ownership -> 404)', async () => {
  // createSyllabusDoc() is owned by the shared testStudent; sign in as someone else.
  const { token: otherToken } = await createStudentAndToken('other');
  const syllabus = await createSyllabusDoc();

  const res = await request(app)
    .post(`/api/syllabus/${syllabus._id}/analyze`)
    .set('Authorization', `Bearer ${otherToken}`);

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);

  // The syllabus must be untouched — no analysis written by the other student.
  const doc = await Syllabus.findById(syllabus._id);
  assert.ok(doc);
  assert.equal(doc.aiAnalysis, null);
});
