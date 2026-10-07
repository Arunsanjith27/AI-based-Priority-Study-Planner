/**
 * AISP-3 & AISP-4: Semester Creation & Subject Management — Automated Test Suite
 *
 * Tests semester creation (AISP-3) and subject add/update/delete management (AISP-4).
 */

require('dotenv').config();
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Student = require('../src/models/Student');
const Semester = require('../src/models/Semester');

let testStudent;
let authToken;

const validStudentData = {
  name: 'Semester Test Student',
  email: 'semestertest@example.com',
  password: 'Password@123',
};

const validSemesterData = {
  name: 'Fall 2026',
  subjects: [
    {
      name: 'Data Structures',
      code: 'CS201',
      credits: 4,
      topics: [{ name: 'Arrays & Linked Lists' }, { name: 'Binary Trees' }],
    },
  ],
};

before(async () => {
  const LOCAL_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-study-planner-test';
  await mongoose.connect(LOCAL_DB_URI, { serverSelectionTimeoutMS: 2000 });
});

after(async () => {
  await Student.deleteMany({});
  await Semester.deleteMany({});
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Student.deleteMany({});
  await Semester.deleteMany({});

  testStudent = await Student.create(validStudentData);
  const secret = process.env.JWT_SECRET || 'dev_aisp2_jwt_secret_key_change_in_production';
  authToken = jwt.sign({ id: testStudent._id }, secret, { expiresIn: '1h' });
});

// ============================================================
// AISP-3: CREATE SEMESTER TESTS
// ============================================================

test('AISP-3 — 1. Successful semester creation', async () => {
  const res = await request(app)
    .post('/api/semesters')
    .set('Authorization', `Bearer ${authToken}`)
    .send(validSemesterData);

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.match(res.body.message, /semester created/i);
  assert.equal(res.body.data.semester.name, validSemesterData.name);
  assert.equal(res.body.data.semester.subjects.length, 1);
  assert.equal(res.body.data.semester.subjects[0].name, 'Data Structures');

  const inDb = await Semester.findById(res.body.data.semester._id);
  assert.ok(inDb);
  assert.equal(inDb.name, validSemesterData.name);
});

test('AISP-3 — 2. Empty semester name', async () => {
  const res = await request(app)
    .post('/api/semesters')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ ...validSemesterData, name: '' });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(await Semester.countDocuments(), 0);
});

test('AISP-3 — 3. Missing semester name', async () => {
  const { name, ...noName } = validSemesterData;
  const res = await request(app)
    .post('/api/semesters')
    .set('Authorization', `Bearer ${authToken}`)
    .send(noName);

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('AISP-3 — 4. Semester with no subjects', async () => {
  const res = await request(app)
    .post('/api/semesters')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ name: 'Empty Semester', subjects: [] });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('AISP-3 — 5. Subject without name', async () => {
  const payload = {
    name: 'Fall 2026',
    subjects: [{ code: 'CS101', credits: 3, topics: [{ name: 'Topic 1' }] }],
  };

  const res = await request(app)
    .post('/api/semesters')
    .set('Authorization', `Bearer ${authToken}`)
    .send(payload);

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('AISP-3 — 6. Subject without credits', async () => {
  const payload = {
    name: 'Fall 2026',
    subjects: [{ name: 'Algorithms', topics: [{ name: 'Sorting' }] }],
  };

  const res = await request(app)
    .post('/api/semesters')
    .set('Authorization', `Bearer ${authToken}`)
    .send(payload);

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('AISP-3 — 7. Subject without topic', async () => {
  const payload = {
    name: 'Fall 2026',
    subjects: [{ name: 'Algorithms', credits: 4, topics: [] }],
  };

  const res = await request(app)
    .post('/api/semesters')
    .set('Authorization', `Bearer ${authToken}`)
    .send(payload);

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('AISP-3 — 8. Credits below minimum', async () => {
  const payload = {
    name: 'Fall 2026',
    subjects: [{ name: 'Math', credits: 0.2, topics: [{ name: 'Algebra' }] }],
  };

  const res = await request(app)
    .post('/api/semesters')
    .set('Authorization', `Bearer ${authToken}`)
    .send(payload);

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('AISP-3 — 9. Credits at minimum boundary', async () => {
  const payload = {
    name: 'Fall 2026',
    subjects: [{ name: 'Lab Course', credits: 0.5, topics: [{ name: 'Experiment 1' }] }],
  };

  const res = await request(app)
    .post('/api/semesters')
    .set('Authorization', `Bearer ${authToken}`)
    .send(payload);

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.semester.subjects[0].credits, 0.5);
});

test('AISP-3 — 10. Credits at maximum boundary', async () => {
  const payload = {
    name: 'Fall 2026',
    subjects: [{ name: 'Major Project', credits: 20, topics: [{ name: 'Implementation' }] }],
  };

  const res = await request(app)
    .post('/api/semesters')
    .set('Authorization', `Bearer ${authToken}`)
    .send(payload);

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.semester.subjects[0].credits, 20);
});

test('AISP-3 — 11. Credits above maximum', async () => {
  const payload = {
    name: 'Fall 2026',
    subjects: [{ name: 'Over-credited Subject', credits: 20.5, topics: [{ name: 'Topic 1' }] }],
  };

  const res = await request(app)
    .post('/api/semesters')
    .set('Authorization', `Bearer ${authToken}`)
    .send(payload);

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('AISP-3 — 12. Unauthenticated semester creation', async () => {
  const res = await request(app)
    .post('/api/semesters')
    .send(validSemesterData);

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /access denied/i);
});

test('AISP-3 — 13. Verify created semester belongs to authenticated student', async () => {
  const res = await request(app)
    .post('/api/semesters')
    .set('Authorization', `Bearer ${authToken}`)
    .send(validSemesterData);

  assert.equal(res.status, 201);
  assert.equal(res.body.data.semester.student.toString(), testStudent._id.toString());
});


// ============================================================
// AISP-4: MANAGE SUBJECTS TESTS
// ============================================================

test('AISP-4 — 14. Add valid subject', async () => {
  const sem = await Semester.create({
    student: testStudent._id,
    ...validSemesterData,
  });

  const newSubjectPayload = {
    name: 'Operating Systems',
    code: 'CS202',
    credits: 3,
    topics: [{ name: 'Process Scheduling' }],
  };

  const res = await request(app)
    .post(`/api/semesters/${sem._id}/subjects`)
    .set('Authorization', `Bearer ${authToken}`)
    .send(newSubjectPayload);

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.subject.name, 'Operating Systems');

  const updatedSem = await Semester.findById(sem._id);
  assert.equal(updatedSem.subjects.length, 2);
});

test('AISP-4 — 15. Add subject to nonexistent semester', async () => {
  const fakeId = new mongoose.Types.ObjectId();
  const res = await request(app)
    .post(`/api/semesters/${fakeId}/subjects`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      name: 'Network Security',
      credits: 3,
      topics: [{ name: 'Cryptography' }],
    });

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /not found/i);
});

test('AISP-4 — 16. Add invalid subject', async () => {
  const sem = await Semester.create({
    student: testStudent._id,
    ...validSemesterData,
  });

  const res = await request(app)
    .post(`/api/semesters/${sem._id}/subjects`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ name: '', credits: 25 }); // invalid name and invalid credits

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('AISP-4 — 17. Update subject name', async () => {
  const sem = await Semester.create({
    student: testStudent._id,
    ...validSemesterData,
  });
  const subjectId = sem.subjects[0]._id;

  const res = await request(app)
    .put(`/api/semesters/${sem._id}/subjects/${subjectId}`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ name: 'Advanced Data Structures' });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.subject.name, 'Advanced Data Structures');

  const updatedSem = await Semester.findById(sem._id);
  assert.equal(updatedSem.subjects.id(subjectId).name, 'Advanced Data Structures');
});

test('AISP-4 — 18. Update subject credits', async () => {
  const sem = await Semester.create({
    student: testStudent._id,
    ...validSemesterData,
  });
  const subjectId = sem.subjects[0]._id;

  const res = await request(app)
    .put(`/api/semesters/${sem._id}/subjects/${subjectId}`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ credits: 5 });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.subject.credits, 5);
});

test('AISP-4 — 19. Update subject topics', async () => {
  const sem = await Semester.create({
    student: testStudent._id,
    ...validSemesterData,
  });
  const subjectId = sem.subjects[0]._id;

  const newTopics = [{ name: 'AVL Trees' }, { name: 'B-Trees' }, { name: 'Graph Algorithms' }];

  const res = await request(app)
    .put(`/api/semesters/${sem._id}/subjects/${subjectId}`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ topics: newTopics });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.subject.topics.length, 3);
});

test('AISP-4 — 20. Update nonexistent subject', async () => {
  const sem = await Semester.create({
    student: testStudent._id,
    ...validSemesterData,
  });
  const fakeSubjectId = new mongoose.Types.ObjectId();

  const res = await request(app)
    .put(`/api/semesters/${sem._id}/subjects/${fakeSubjectId}`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ name: 'New Name' });

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});

test('AISP-4 — 21. Update nonexistent semester', async () => {
  const fakeSemId = new mongoose.Types.ObjectId();
  const fakeSubId = new mongoose.Types.ObjectId();

  const res = await request(app)
    .put(`/api/semesters/${fakeSemId}/subjects/${fakeSubId}`)
    .set('Authorization', `Bearer ${authToken}`)
    .send({ name: 'New Name' });

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});

test('AISP-4 — 22. Delete valid subject', async () => {
  const sem = await Semester.create({
    student: testStudent._id,
    name: 'Fall 2026',
    subjects: [
      { name: 'Data Structures', credits: 4, topics: [{ name: 'Trees' }] },
      { name: 'Operating Systems', credits: 3, topics: [{ name: 'Processes' }] },
    ],
  });
  const subjectId = sem.subjects[0]._id;

  const res = await request(app)
    .delete(`/api/semesters/${sem._id}/subjects/${subjectId}`)
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  const updatedSem = await Semester.findById(sem._id);
  assert.equal(updatedSem.subjects.length, 1);
  assert.equal(updatedSem.subjects[0].name, 'Operating Systems');
});

test('AISP-4 — 23. Delete nonexistent subject', async () => {
  const sem = await Semester.create({
    student: testStudent._id,
    ...validSemesterData,
  });
  const fakeSubjectId = new mongoose.Types.ObjectId();

  const res = await request(app)
    .delete(`/api/semesters/${sem._id}/subjects/${fakeSubjectId}`)
    .set('Authorization', `Bearer ${authToken}`);

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});

test('AISP-4 — 24. Unauthenticated subject operation', async () => {
  const sem = await Semester.create({
    student: testStudent._id,
    ...validSemesterData,
  });
  const subjectId = sem.subjects[0]._id;

  const res = await request(app)
    .delete(`/api/semesters/${sem._id}/subjects/${subjectId}`);
    // No Authorization header

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});
