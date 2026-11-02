/**
 * AISP-8: Review AI Analysis — Automated Test Suite
 *
 * Covers:
 *   GET  /api/syllabus/:id          (getSyllabusById)
 *   POST /api/syllabus/:id/analyze  (analyzeSyllabusById)
 *   PUT  /api/syllabus/:id/review   (reviewSyllabus)
 *
 * Stub Ollama server started in before(), pointed at via OLLAMA_HOST.
 * MongoMemoryServer fallback so the suite runs without a local mongod.
 */

require('dotenv').config();
const { test, before, after, beforeEach } = require('node:test');
const assert  = require('node:assert/strict');
const http    = require('node:http');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt     = require('jsonwebtoken');
const path    = require('path');
const app     = require('../src/app');
const Syllabus = require('../src/models/Syllabus');
const Student  = require('../src/models/Student');

process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'dev_aisp2_jwt_secret_key_change_in_production';
process.env.OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b-instruct';

const JWT_SECRET  = process.env.JWT_SECRET;
const uploadsDir  = path.join(__dirname, '../uploads');

// ── shared test state ─────────────────────────────────────────────────────────
let mongoServer;
let testStudent;
let authToken;

// ── Ollama stub ───────────────────────────────────────────────────────────────
let ollamaStub;
let ollamaStubResponse = {
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

// ── lifecycle ─────────────────────────────────────────────────────────────────
before(async () => {
  // MongoDB
  const LOCAL_DB_URI =
    process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-study-planner-test';
  try {
    await mongoose.connect(LOCAL_DB_URI, { serverSelectionTimeoutMS: 2000 });
  } catch {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }

  // Ollama stub
  await new Promise((resolve) => {
    ollamaStub = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        res.writeHead(ollamaStubResponse.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(ollamaStubResponse.body));
      });
    });
    ollamaStub.listen(0, '127.0.0.1', () => {
      process.env.OLLAMA_HOST = `http://127.0.0.1:${ollamaStub.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await Syllabus.deleteMany({});
  await Student.deleteMany({});
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
  if (ollamaStub) await new Promise((resolve) => ollamaStub.close(() => resolve()));
});

beforeEach(async () => {
  await Syllabus.deleteMany({});
  await Student.deleteMany({});

  testStudent = await Student.create({
    name: 'Review Test Student',
    email: 'review-test@example.com',
    password: 'Password@123',
  });
  authToken = jwt.sign({ id: testStudent._id }, JWT_SECRET, { expiresIn: '1h' });

  // Reset stub to default good response
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
});

// ── helpers ───────────────────────────────────────────────────────────────────
async function createSyllabusDoc(overrides = {}) {
  return Syllabus.create({
    student:          testStudent._id,
    subject:          'Operating Systems',
    originalFileName: 'os-syllabus.txt',
    filePath:         path.join(uploadsDir, 'os-syllabus.txt'),
    fileType:         'text/plain',
    extractedText:
      'Unit 1: Processes and Threads\nUnit 2: CPU Scheduling\nUnit 3: Memory Management\nUnit 4: File Systems',
    ...overrides,
  });
}

async function createSyllabusWithAnalysis(overrides = {}) {
  const doc = await createSyllabusDoc();
  doc.aiAnalysis = {
    subjectName: 'Operating Systems',
    code:        'CS304',
    credits:     4,
    topics: [
      { name: 'Processes and Threads', included: true  },
      { name: 'CPU Scheduling',        included: true  },
      { name: 'Memory Management',     included: true  },
      { name: 'File Systems',          included: true  },
    ],
    model:      'qwen2.5:7b-instruct',
    status:     'completed',
    analyzedAt: new Date(),
  };
  doc.reviewStatus = 'pending';
  Object.assign(doc, overrides);
  await doc.save();
  return doc;
}

async function createOtherStudent() {
  const student = await Student.create({
    name:     'Other Student',
    email:    `other-${Date.now()}@example.com`,
    password: 'Password@123',
  });
  const token = jwt.sign({ id: student._id }, JWT_SECRET, { expiresIn: '1h' });
  return { student, token };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AISP-8-A: GET /api/syllabus/:id
// ═══════════════════════════════════════════════════════════════════════════════

test('AISP-8-A-1. GET own syllabus returns 200 with syllabus data', async () => {
  const doc = await createSyllabusDoc();

  const res = await request(app)
    .get(`/api/syllabus/${doc._id}`)
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.syllabus);
  assert.equal(res.body.data.syllabus.subject, 'Operating Systems');
  assert.equal(res.body.data.syllabus.reviewStatus, 'pending');
});

test('AISP-8-A-2. GET syllabus returns aiAnalysis when present', async () => {
  const doc = await createSyllabusWithAnalysis();

  const res = await request(app)
    .get(`/api/syllabus/${doc._id}`)
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(res.status, 200);
  assert.ok(res.body.data.syllabus.aiAnalysis);
  assert.equal(res.body.data.syllabus.aiAnalysis.subjectName, 'Operating Systems');
  assert.equal(res.body.data.syllabus.aiAnalysis.topics.length, 4);
});

test('AISP-8-A-3. GET syllabus requires authentication (401 without token)', async () => {
  const doc = await createSyllabusDoc();

  const res = await request(app).get(`/api/syllabus/${doc._id}`);

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('AISP-8-A-4. GET another student\'s syllabus returns 404', async () => {
  const doc = await createSyllabusDoc();
  const { token: otherToken } = await createOtherStudent();

  const res = await request(app)
    .get(`/api/syllabus/${doc._id}`)
    .set('Authorization', `Bearer ${otherToken}`);

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});

test('AISP-8-A-5. GET unknown syllabus id returns 404', async () => {
  const res = await request(app)
    .get('/api/syllabus/64a1b2c3d4e5f6a7b8c9d0e1')
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});

// ═══════════════════════════════════════════════════════════════════════════════
// AISP-8-B: POST /api/syllabus/:id/analyze
// ═══════════════════════════════════════════════════════════════════════════════

test('AISP-8-B-1. Analyze returns structured outline and persists aiAnalysis', async () => {
  const doc = await createSyllabusDoc();

  const res = await request(app)
    .post(`/api/syllabus/${doc._id}/analyze`)
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.match(res.body.message, /analyzed successfully/i);

  const analysis = res.body.data.analysis;
  assert.equal(analysis.subjectName, 'Operating Systems');
  assert.equal(analysis.code, 'CS304');
  assert.equal(analysis.credits, 4);
  assert.equal(analysis.topics.length, 4);
  assert.equal(analysis.topics[0].name, 'Processes and Threads');

  // Persisted
  const saved = await Syllabus.findById(doc._id);
  assert.ok(saved.aiAnalysis);
  assert.equal(saved.aiAnalysis.topics.length, 4);
  assert.equal(saved.aiAnalysis.topics[0].included, true); // pre-selected for review
  assert.equal(saved.reviewStatus, 'pending');
});

test('AISP-8-B-2. Re-analyze resets a prior review decision to pending', async () => {
  const doc = await createSyllabusWithAnalysis({ reviewStatus: 'approved', reviewFeedback: 'good' });

  const res = await request(app)
    .post(`/api/syllabus/${doc._id}/analyze`)
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(res.status, 200);

  const saved = await Syllabus.findById(doc._id);
  assert.equal(saved.reviewStatus, 'pending');
  assert.equal(saved.reviewFeedback, '');
  assert.equal(saved.reviewedAt, null);
});

test('AISP-8-B-3. Analyze returns 400 when syllabus has no extracted text', async () => {
  const doc = await createSyllabusDoc({ extractedText: '   ' });

  const res = await request(app)
    .post(`/api/syllabus/${doc._id}/analyze`)
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /no extracted text/i);
});

test('AISP-8-B-4. Analyze returns 503 when Ollama is unreachable', async () => {
  const doc = await createSyllabusDoc();
  const prevHost = process.env.OLLAMA_HOST;
  process.env.OLLAMA_HOST = 'http://127.0.0.1:9';

  try {
    const res = await request(app)
      .post(`/api/syllabus/${doc._id}/analyze`)
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /ollama/i);
  } finally {
    process.env.OLLAMA_HOST = prevHost;
  }
});

test('AISP-8-B-5. Analyze returns 502 when model emits non-JSON', async () => {
  const doc = await createSyllabusDoc();
  ollamaStubResponse = {
    status: 200,
    body:   { message: { content: 'Not valid JSON at all.' } },
  };

  const res = await request(app)
    .post(`/api/syllabus/${doc._id}/analyze`)
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(res.status, 502);
  assert.equal(res.body.success, false);
});

test('AISP-8-B-6. Analyze returns 422 when model produces no topics', async () => {
  const doc = await createSyllabusDoc();
  ollamaStubResponse = {
    status: 200,
    body:   { message: { content: JSON.stringify({ subjectName: 'OS', topics: [] }) } },
  };

  const res = await request(app)
    .post(`/api/syllabus/${doc._id}/analyze`)
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(res.status, 422);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /topics/i);
});

test('AISP-8-B-7. Analyze requires authentication (401 without token)', async () => {
  const doc = await createSyllabusDoc();

  const res = await request(app).post(`/api/syllabus/${doc._id}/analyze`);

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('AISP-8-B-8. Cannot analyze another student\'s syllabus (404)', async () => {
  const doc = await createSyllabusDoc();
  const { token: otherToken } = await createOtherStudent();

  const res = await request(app)
    .post(`/api/syllabus/${doc._id}/analyze`)
    .set('Authorization', `Bearer ${otherToken}`);

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);

  const saved = await Syllabus.findById(doc._id);
  assert.equal(saved.aiAnalysis, null); // untouched
});

// ═══════════════════════════════════════════════════════════════════════════════
// AISP-8-C: PUT /api/syllabus/:id/review
// ═══════════════════════════════════════════════════════════════════════════════

test('AISP-8-C-1. Approve sets reviewStatus=approved and persists edits', async () => {
  const doc = await createSyllabusWithAnalysis();

  const res = await request(app)
    .put(`/api/syllabus/${doc._id}/review`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      decision:    'approved',
      feedback:    'Looks good',
      subjectName: 'Operating Systems (Revised)',
      code:        'CS305',
      credits:     3,
      topics: [
        { name: 'Processes and Threads', included: true  },
        { name: 'CPU Scheduling',        included: false },
        { name: 'Memory Management',     included: true  },
        { name: 'File Systems',          included: true  },
      ],
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.match(res.body.message, /approved/i);

  const saved = res.body.data.syllabus;
  assert.equal(saved.reviewStatus, 'approved');
  assert.equal(saved.reviewFeedback, 'Looks good');
  assert.ok(saved.reviewedAt);
  assert.equal(saved.aiAnalysis.subjectName, 'Operating Systems (Revised)');
  assert.equal(saved.aiAnalysis.code, 'CS305');
  assert.equal(saved.aiAnalysis.credits, 3);

  // Per-topic included flags should be persisted.
  const topicMap = Object.fromEntries(saved.aiAnalysis.topics.map(t => [t.name, t.included]));
  assert.equal(topicMap['Processes and Threads'], true);
  assert.equal(topicMap['CPU Scheduling'], false);
  assert.equal(topicMap['Memory Management'], true);
});

test('AISP-8-C-2. Reject sets reviewStatus=rejected and stores feedback', async () => {
  const doc = await createSyllabusWithAnalysis();

  const res = await request(app)
    .put(`/api/syllabus/${doc._id}/review`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ decision: 'rejected', feedback: 'Topics are wrong' });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.syllabus.reviewStatus, 'rejected');
  assert.equal(res.body.data.syllabus.reviewFeedback, 'Topics are wrong');
  assert.ok(res.body.data.syllabus.reviewedAt);
});

test('AISP-8-C-3. Approve persists to MongoDB', async () => {
  const doc = await createSyllabusWithAnalysis();

  await request(app)
    .put(`/api/syllabus/${doc._id}/review`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ decision: 'approved' });

  const saved = await Syllabus.findById(doc._id);
  assert.equal(saved.reviewStatus, 'approved');
  assert.ok(saved.reviewedAt instanceof Date);
});

test('AISP-8-C-4. Review returns 400 when decision is missing or invalid', async () => {
  const doc = await createSyllabusWithAnalysis();

  const res = await request(app)
    .put(`/api/syllabus/${doc._id}/review`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ decision: 'maybe' });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /invalid decision/i);
});

test('AISP-8-C-5. Review returns 400 when syllabus has no analysis yet', async () => {
  const doc = await createSyllabusDoc(); // no aiAnalysis

  const res = await request(app)
    .put(`/api/syllabus/${doc._id}/review`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ decision: 'approved' });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /not been analyzed/i);
});

test('AISP-8-C-6. Review requires authentication (401 without token)', async () => {
  const doc = await createSyllabusWithAnalysis();

  const res = await request(app)
    .put(`/api/syllabus/${doc._id}/review`)
    .send({ decision: 'approved' });

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('AISP-8-C-7. Cannot review another student\'s syllabus (404)', async () => {
  const doc = await createSyllabusWithAnalysis();
  const { token: otherToken } = await createOtherStudent();

  const res = await request(app)
    .put(`/api/syllabus/${doc._id}/review`)
    .set('Authorization', `Bearer ${otherToken}`)
    .send({ decision: 'approved' });

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);

  // Decision must not have been written.
  const saved = await Syllabus.findById(doc._id);
  assert.equal(saved.reviewStatus, 'pending');
});

test('AISP-8-C-8. Review returns 404 for an unknown syllabus id', async () => {
  const res = await request(app)
    .put('/api/syllabus/64a1b2c3d4e5f6a7b8c9d0e1/review')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ decision: 'approved' });

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});

test('AISP-8-C-9. Approve with no topic edits preserves original included flags', async () => {
  const doc = await createSyllabusWithAnalysis();

  const res = await request(app)
    .put(`/api/syllabus/${doc._id}/review`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ decision: 'approved' }); // no topics override

  assert.equal(res.status, 200);
  const saved = res.body.data.syllabus.aiAnalysis.topics;
  assert.equal(saved.every(t => t.included === true), true);
});

test('AISP-8-C-10. Credits are clamped/rounded on approval', async () => {
  const doc = await createSyllabusWithAnalysis();

  const res = await request(app)
    .put(`/api/syllabus/${doc._id}/review`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ decision: 'approved', credits: 3.3 }); // rounds to 3.5

  assert.equal(res.status, 200);
  assert.equal(res.body.data.syllabus.aiAnalysis.credits, 3.5);
});

// ═══════════════════════════════════════════════════════════════════════════════
// AISP-8-D: upload flow integration (auth required)
// ═══════════════════════════════════════════════════════════════════════════════

test('AISP-8-D-1. Upload requires authentication (401 without token)', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .field('subject', 'Operating Systems')
    .attach('syllabus', Buffer.from('Unit 1: Processes'), 'os.txt');

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('AISP-8-D-2. Authenticated upload sets student ref and creates reviewable doc', async () => {
  const res = await request(app)
    .post('/api/syllabus/upload')
    .set('Authorization', `Bearer ${authToken}`)
    .field('subject', 'Operating Systems')
    .attach(
      'syllabus',
      Buffer.from('Unit 1: Processes\nUnit 2: Memory Management'),
      'os.txt'
    );

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);

  const doc = await Syllabus.findById(res.body.syllabus._id);
  assert.ok(doc);
  assert.equal(String(doc.student), String(testStudent._id));
  assert.equal(doc.reviewStatus, 'pending');
  assert.equal(doc.aiAnalysis, null);
});
