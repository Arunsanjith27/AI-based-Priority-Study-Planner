const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Student = require('../src/models/Student');
const bcrypt = require('bcryptjs');

const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-study-planner-test';

const validStudent = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  password: 'Secure@123',
};

before(async () => {
  await mongoose.connect(TEST_DB_URI);
});

after(async () => {
  await Student.deleteMany({});
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Student.deleteMany({});
});

// ============================================================
// TEST 1 — Successful registration
// ============================================================
test('TEST 1 — Successful registration: should register a student with valid data', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send(validStudent);

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.match(res.body.message, /registration successful/i);
  assert.equal(res.body.data.student.name, validStudent.name);
  assert.equal(res.body.data.student.email, validStudent.email.toLowerCase());
  assert.equal(res.body.data.student.password, undefined);
  assert.ok(res.body.data.student._id);

  const studentInDb = await Student.findOne({ email: validStudent.email });
  assert.ok(studentInDb);
  assert.equal(studentInDb.name, validStudent.name);
});

// ============================================================
// TEST 2 — Empty name
// ============================================================
test('TEST 2 — Empty name: should reject registration with empty name', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, name: '' });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  const count = await Student.countDocuments();
  assert.equal(count, 0);
});

test('TEST 2 — Empty name: should reject registration with missing name field', async () => {
  const { name, ...noName } = validStudent;
  const res = await request(app)
    .post('/api/students/register')
    .send(noName);

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

// ============================================================
// TEST 3 — Empty email
// ============================================================
test('TEST 3 — Empty email: should reject registration with empty email', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, email: '' });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  const count = await Student.countDocuments();
  assert.equal(count, 0);
});

test('TEST 3 — Empty email: should reject registration with missing email field', async () => {
  const { email, ...noEmail } = validStudent;
  const res = await request(app)
    .post('/api/students/register')
    .send(noEmail);

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

// ============================================================
// TEST 4 — Invalid email format
// ============================================================
const invalidEmails = [
  'studentexample.com',
  'student@',
  '@example.com',
  'student@.com',
  'student@ example.com',
  'student@example',
  'plain-text',
];

for (const invalidEmail of invalidEmails) {
  test(`TEST 4 — Invalid email format: should reject "${invalidEmail}"`, async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, email: invalidEmail });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });
}

// ============================================================
// TEST 5 — Empty password
// ============================================================
test('TEST 5 — Empty password: should reject registration with empty password', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, password: '' });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  const count = await Student.countDocuments();
  assert.equal(count, 0);
});

test('TEST 5 — Empty password: should reject registration with missing password field', async () => {
  const { password, ...noPassword } = validStudent;
  const res = await request(app)
    .post('/api/students/register')
    .send(noPassword);

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

// ============================================================
// TEST 6 — Weak/invalid password
// ============================================================
test('TEST 6 — Weak/invalid password: reject shorter than 8 chars', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, password: 'Ab1@xyz' });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('TEST 6 — Weak/invalid password: reject without uppercase', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, password: 'secure@123' });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('TEST 6 — Weak/invalid password: reject without lowercase', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, password: 'SECURE@123' });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('TEST 6 — Weak/invalid password: reject without digit', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, password: 'Secure@abc' });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('TEST 6 — Weak/invalid password: reject without special char', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, password: 'Secure1234' });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

// ============================================================
// TEST 7 — Duplicate email
// ============================================================
test('TEST 7 — Duplicate email: reject already registered email', async () => {
  const res1 = await request(app)
    .post('/api/students/register')
    .send(validStudent);
  assert.equal(res1.status, 201);

  const res2 = await request(app)
    .post('/api/students/register')
    .send({
      name: 'Jane Doe',
      email: validStudent.email,
      password: 'AnotherPass@1',
    });

  assert.equal(res2.status, 409);
  assert.equal(res2.body.success, false);
  assert.match(res2.body.message, /already exists/i);

  const count = await Student.countDocuments();
  assert.equal(count, 1);
});

test('TEST 7 — Duplicate email: case-insensitive check', async () => {
  await request(app)
    .post('/api/students/register')
    .send(validStudent);

  const res = await request(app)
    .post('/api/students/register')
    .send({
      ...validStudent,
      name: 'Different Name',
      email: validStudent.email.toUpperCase(),
    });

  assert.equal(res.status, 409);
  assert.equal(res.body.success, false);

  const count = await Student.countDocuments();
  assert.equal(count, 1);
});

// ============================================================
// TEST 8 — Password security
// ============================================================
test('TEST 8 — Password security: store hashed password, not plain text', async () => {
  await request(app)
    .post('/api/students/register')
    .send(validStudent);

  const studentInDb = await Student.findOne({ email: validStudent.email });
  assert.ok(studentInDb);
  assert.notEqual(studentInDb.password, validStudent.password);
  assert.match(studentInDb.password, /^\$2[aby]?\$.{56}$/);

  const isMatch = await bcrypt.compare(validStudent.password, studentInDb.password);
  assert.equal(isMatch, true);
});

test('TEST 8 — Password security: never return password in response', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send(validStudent);

  assert.equal(res.status, 201);
  assert.equal(res.body.data.student.password, undefined);
  const responseStr = JSON.stringify(res.body);
  assert.equal(responseStr.includes(validStudent.password), false);
});

// ============================================================
// TEST 9 — Boundary/edge input
// ============================================================
test('TEST 9 — Boundary/edge: accept name with 2 characters (min)', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, name: 'AB', email: 'ab@example.com' });

  assert.equal(res.status, 201);
});

test('TEST 9 — Boundary/edge: reject name with 1 character (below min)', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, name: 'A', email: 'a@example.com' });

  assert.equal(res.status, 400);
});

test('TEST 9 — Boundary/edge: accept name with 100 characters (max)', async () => {
  const longName = 'A'.repeat(100);
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, name: longName, email: 'long@example.com' });

  assert.equal(res.status, 201);
});

test('TEST 9 — Boundary/edge: reject name with 101 characters (above max)', async () => {
  const tooLongName = 'A'.repeat(101);
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, name: tooLongName, email: 'toolong@example.com' });

  assert.equal(res.status, 400);
});

test('TEST 9 — Boundary/edge: accept password with 8 characters (min)', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, password: 'Abcde@1x', email: 'min@example.com' });

  assert.equal(res.status, 201);
});

test('TEST 9 — Boundary/edge: reject password with 7 characters (below min)', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, password: 'Abc@1xx', email: 'short@example.com' });

  assert.equal(res.status, 400);
});

test('TEST 9 — Boundary/edge: accept password with 128 characters (max)', async () => {
  const longPass = 'Aa1@' + 'x'.repeat(124);
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, password: longPass, email: 'maxpass@example.com' });

  assert.equal(res.status, 201);
});

test('TEST 9 — Boundary/edge: reject password with 129 characters (above max)', async () => {
  const tooLongPass = 'Aa1@' + 'x'.repeat(125);
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, password: tooLongPass, email: 'overpass@example.com' });

  assert.equal(res.status, 400);
});

test('TEST 9 — Boundary/edge: trim whitespace from name', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, name: '  John Doe  ', email: 'trim@example.com' });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.student.name, 'John Doe');
});

test('TEST 9 — Boundary/edge: whitespace-only name treated as empty', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, name: '   ', email: 'ws@example.com' });

  assert.equal(res.status, 400);
});

// ============================================================
// TEST 10 — Invalid registration must not create an account
// ============================================================
test('TEST 10 — Invalid registration: empty fields -> no account created', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ name: '', email: '', password: '' });

  assert.equal(res.status, 400);
  const count = await Student.countDocuments();
  assert.equal(count, 0);
});

test('TEST 10 — Invalid registration: invalid email -> no account created', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, email: 'not-an-email' });

  assert.equal(res.status, 400);
  const count = await Student.countDocuments();
  assert.equal(count, 0);
});

test('TEST 10 — Invalid registration: weak password -> no account created', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({ ...validStudent, password: '123' });

  assert.equal(res.status, 400);
  const count = await Student.countDocuments();
  assert.equal(count, 0);
});

test('TEST 10 — Invalid registration: empty body -> no account created', async () => {
  const res = await request(app)
    .post('/api/students/register')
    .send({});

  assert.equal(res.status, 400);
  const count = await Student.countDocuments();
  assert.equal(count, 0);
});
