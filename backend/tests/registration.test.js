const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Student = require('../src/models/Student');
const bcrypt = require('bcryptjs');

// Increase default Jest timeout for async DB & bcrypt ops
jest.setTimeout(30000);

const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-study-planner-test';

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
});

afterAll(async () => {
  await Student.deleteMany({});
  await mongoose.connection.close();
});

beforeEach(async () => {
  // Clean up test collection before each test to ensure complete test isolation
  await Student.deleteMany({});
});

// ============================================================
// HELPER
// ============================================================

const validStudent = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  password: 'Secure@123',
};

// ============================================================
// TEST 1 — Successful registration
// ============================================================
describe('TEST 1 — Successful registration', () => {
  it('should register a student with valid data and return 201', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send(validStudent);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/registration successful/i);
    expect(res.body.data.student).toHaveProperty('name', validStudent.name);
    expect(res.body.data.student).toHaveProperty('email', validStudent.email.toLowerCase());
    expect(res.body.data.student).not.toHaveProperty('password');
    expect(res.body.data.student).toHaveProperty('_id');

    // Verify the student exists in the database
    const studentInDb = await Student.findOne({ email: validStudent.email });
    expect(studentInDb).not.toBeNull();
    expect(studentInDb.name).toBe(validStudent.name);
  });
});

// ============================================================
// TEST 2 — Empty name
// ============================================================
describe('TEST 2 — Empty name', () => {
  it('should reject registration with empty name', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, name: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
      ])
    );

    // Verify no student was created
    const count = await Student.countDocuments();
    expect(count).toBe(0);
  });

  it('should reject registration with missing name field', async () => {
    const { name, ...noName } = validStudent;
    const res = await request(app)
      .post('/api/students/register')
      .send(noName);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================
// TEST 3 — Empty email
// ============================================================
describe('TEST 3 — Empty email', () => {
  it('should reject registration with empty email', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, email: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
      ])
    );

    const count = await Student.countDocuments();
    expect(count).toBe(0);
  });

  it('should reject registration with missing email field', async () => {
    const { email, ...noEmail } = validStudent;
    const res = await request(app)
      .post('/api/students/register')
      .send(noEmail);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================
// TEST 4 — Invalid email format
// ============================================================
describe('TEST 4 — Invalid email format', () => {
  const invalidEmails = [
    'studentexample.com',
    'student@',
    '@example.com',
    'student@.com',
    'student@ example.com',
    'student@example',
    'plain-text',
  ];

  it.each(invalidEmails)(
    'should reject registration with invalid email: "%s"',
    async (invalidEmail) => {
      const res = await request(app)
        .post('/api/students/register')
        .send({ ...validStudent, email: invalidEmail });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
        ])
      );
    }
  );
});

// ============================================================
// TEST 5 — Empty password
// ============================================================
describe('TEST 5 — Empty password', () => {
  it('should reject registration with empty password', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, password: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );

    const count = await Student.countDocuments();
    expect(count).toBe(0);
  });

  it('should reject registration with missing password field', async () => {
    const { password, ...noPassword } = validStudent;
    const res = await request(app)
      .post('/api/students/register')
      .send(noPassword);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================
// TEST 6 — Weak/invalid password
// ============================================================
describe('TEST 6 — Weak/invalid password', () => {
  it('should reject password shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, password: 'Ab1@xyz' }); // 7 chars

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
  });

  it('should reject password without uppercase letter', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, password: 'secure@123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'password',
          message: expect.stringMatching(/uppercase/i),
        }),
      ])
    );
  });

  it('should reject password without lowercase letter', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, password: 'SECURE@123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'password',
          message: expect.stringMatching(/lowercase/i),
        }),
      ])
    );
  });

  it('should reject password without digit', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, password: 'Secure@abc' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'password',
          message: expect.stringMatching(/digit/i),
        }),
      ])
    );
  });

  it('should reject password without special character', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, password: 'Secure1234' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'password',
          message: expect.stringMatching(/special/i),
        }),
      ])
    );
  });
});

// ============================================================
// TEST 7 — Duplicate email
// ============================================================
describe('TEST 7 — Duplicate email', () => {
  it('should reject registration with an already registered email', async () => {
    // First registration
    const res1 = await request(app)
      .post('/api/students/register')
      .send(validStudent);

    expect(res1.status).toBe(201);

    // Second registration with same email
    const res2 = await request(app)
      .post('/api/students/register')
      .send({
        name: 'Jane Doe',
        email: validStudent.email,
        password: 'AnotherPass@1',
      });

    expect(res2.status).toBe(409);
    expect(res2.body.success).toBe(false);
    expect(res2.body.message).toMatch(/already exists/i);

    // Verify only one student exists
    const count = await Student.countDocuments();
    expect(count).toBe(1);
  });

  it('should treat emails case-insensitively', async () => {
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

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);

    const count = await Student.countDocuments();
    expect(count).toBe(1);
  });
});

// ============================================================
// TEST 8 — Password security
// ============================================================
describe('TEST 8 — Password security', () => {
  it('should store a hashed password, not plain text', async () => {
    await request(app)
      .post('/api/students/register')
      .send(validStudent);

    const studentInDb = await Student.findOne({ email: validStudent.email });
    expect(studentInDb).not.toBeNull();

    // The stored password must NOT be the plain text
    expect(studentInDb.password).not.toBe(validStudent.password);

    // The stored password should be a valid bcrypt hash
    expect(studentInDb.password).toMatch(/^\$2[aby]?\$.{56}$/);

    // The hash should verify against the original password
    const isMatch = await bcrypt.compare(validStudent.password, studentInDb.password);
    expect(isMatch).toBe(true);
  });

  it('should never return password in the API response', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send(validStudent);

    expect(res.status).toBe(201);
    expect(res.body.data.student).not.toHaveProperty('password');

    // Also ensure __v and other internals are safe
    const responseStr = JSON.stringify(res.body);
    expect(responseStr).not.toContain(validStudent.password);
  });
});

// ============================================================
// TEST 9 — Boundary/edge input
// ============================================================
describe('TEST 9 — Boundary/edge input', () => {
  it('should accept name with exactly 2 characters (minimum)', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, name: 'AB', email: 'ab@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should reject name with 1 character (below minimum)', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, name: 'A', email: 'a@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should accept name with exactly 100 characters (maximum)', async () => {
    const longName = 'A'.repeat(100);
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, name: longName, email: 'long@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should reject name with 101 characters (above maximum)', async () => {
    const tooLongName = 'A'.repeat(101);
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, name: tooLongName, email: 'toolong@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should accept password with exactly 8 characters (minimum)', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, password: 'Abcde@1x', email: 'min@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should reject password with 7 characters (below minimum)', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, password: 'Abc@1xx', email: 'short@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should accept password with 128 characters (maximum)', async () => {
    // Build a 128-char password that meets all rules
    const longPass = 'Aa1@' + 'x'.repeat(124);
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, password: longPass, email: 'maxpass@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should reject password with 129 characters (above maximum)', async () => {
    const tooLongPass = 'Aa1@' + 'x'.repeat(125);
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, password: tooLongPass, email: 'overpass@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should trim whitespace from name', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, name: '  John Doe  ', email: 'trim@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.data.student.name).toBe('John Doe');
  });

  it('should handle name with only whitespace as empty', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, name: '   ', email: 'ws@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================
// TEST 10 — Invalid registration must not create an account
// ============================================================
describe('TEST 10 — Invalid registration must not create an account', () => {
  it('should not create account with all-empty fields', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ name: '', email: '', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    const count = await Student.countDocuments();
    expect(count).toBe(0);
  });

  it('should not create account with invalid email', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, email: 'not-an-email' });

    expect(res.status).toBe(400);
    const count = await Student.countDocuments();
    expect(count).toBe(0);
  });

  it('should not create account with weak password', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({ ...validStudent, password: '123' });

    expect(res.status).toBe(400);
    const count = await Student.countDocuments();
    expect(count).toBe(0);
  });

  it('should not create account with empty body', async () => {
    const res = await request(app)
      .post('/api/students/register')
      .send({});

    expect(res.status).toBe(400);
    const count = await Student.countDocuments();
    expect(count).toBe(0);
  });
});
