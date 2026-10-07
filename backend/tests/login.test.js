/**
 * AISP-2: Student Login — Automated Test Suite
 *
 * Tests ONLY the login functionality implemented in AISP-2.
 * Does NOT test AISP-1 registration functionality.
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const app = require('../src/app');
const Student = require('../src/models/Student');

// ─── Test helpers ───

const TEST_PORT = 5555;
let server;
let baseUrl;

/**
 * Valid student credentials for a pre-registered account.
 * Used as precondition for login tests.
 */
const VALID_STUDENT = {
  name: 'Login Test Student',
  email: 'logintest@example.com',
  password: 'Test@1234',
};

/**
 * Make an HTTP request to the test server.
 */
async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const body = await res.json();
  return { status: res.status, body };
}

// ─── Setup & Teardown ───

before(async () => {
  // Load env
  require('dotenv').config();

  // Connect to test database
  const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-study-planner-test';
  await mongoose.connect(TEST_DB_URI);

  // Start the server
  server = app.listen(TEST_PORT);
  baseUrl = `http://127.0.0.1:${TEST_PORT}/api`;

  // Clean up any leftover test data and create a pre-registered student
  await Student.deleteOne({ email: VALID_STUDENT.email });
  await Student.create(VALID_STUDENT);
});

after(async () => {
  // Clean up test data
  await Student.deleteOne({ email: VALID_STUDENT.email });

  // Close connections
  if (server) server.close();
  await mongoose.connection.close();
});

// ═══════════════════════════════════════════════════════
// POSITIVE TESTS
// ═══════════════════════════════════════════════════════

describe('AISP-2: Student Login — Positive Tests', () => {

  it('TC-01: Successful login with valid credentials', async () => {
    const res = await request('/students/login', {
      method: 'POST',
      body: JSON.stringify({
        email: VALID_STUDENT.email,
        password: VALID_STUDENT.password,
      }),
    });

    assert.equal(res.status, 200, 'Should return 200 OK');
    assert.equal(res.body.success, true, 'success should be true');
    assert.ok(res.body.data.token, 'Response should include a JWT token');
    assert.ok(res.body.data.student, 'Response should include student data');
    assert.equal(res.body.data.student.email, VALID_STUDENT.email);
    assert.equal(res.body.data.student.name, VALID_STUDENT.name);
    assert.equal(res.body.data.student.password, undefined, 'Password must not be returned');
  });

  it('TC-08: Authenticated access to protected dashboard', async () => {
    // First, login to get a token
    const loginRes = await request('/students/login', {
      method: 'POST',
      body: JSON.stringify({
        email: VALID_STUDENT.email,
        password: VALID_STUDENT.password,
      }),
    });

    assert.equal(loginRes.status, 200);
    const token = loginRes.body.data.token;

    // Access dashboard with valid token
    const dashRes = await request('/students/dashboard', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(dashRes.status, 200, 'Should return 200 OK');
    assert.equal(dashRes.body.success, true);
    assert.ok(dashRes.body.data.student, 'Dashboard should return student data');
    assert.equal(dashRes.body.data.student.email, VALID_STUDENT.email);
    assert.equal(dashRes.body.data.student.password, undefined, 'Password must not be in dashboard response');
  });
});

// ═══════════════════════════════════════════════════════
// NEGATIVE TESTS
// ═══════════════════════════════════════════════════════

describe('AISP-2: Student Login — Negative Tests', () => {

  it('TC-02: Incorrect password', async () => {
    const res = await request('/students/login', {
      method: 'POST',
      body: JSON.stringify({
        email: VALID_STUDENT.email,
        password: 'WrongPassword@1',
      }),
    });

    assert.equal(res.status, 401, 'Should return 401 Unauthorized');
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Invalid email or password.');
    assert.equal(res.body.data, undefined, 'Should not return student data or token');
  });

  it('TC-03: Unregistered email', async () => {
    const res = await request('/students/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'AnyPassword@1',
      }),
    });

    assert.equal(res.status, 401, 'Should return 401 Unauthorized');
    assert.equal(res.body.success, false);
    // Must use generic error — should not reveal whether email exists
    assert.equal(res.body.message, 'Invalid email or password.');
  });

  it('TC-04: Empty email', async () => {
    const res = await request('/students/login', {
      method: 'POST',
      body: JSON.stringify({
        email: '',
        password: VALID_STUDENT.password,
      }),
    });

    assert.equal(res.status, 400, 'Should return 400 for validation failure');
    assert.equal(res.body.success, false);
    // Verify validation catches empty email
    const emailError = res.body.errors?.find((e) => e.field === 'email');
    assert.ok(emailError, 'Should have an email validation error');
  });

  it('TC-05: Empty password', async () => {
    const res = await request('/students/login', {
      method: 'POST',
      body: JSON.stringify({
        email: VALID_STUDENT.email,
        password: '',
      }),
    });

    assert.equal(res.status, 400, 'Should return 400 for validation failure');
    assert.equal(res.body.success, false);
    const passwordError = res.body.errors?.find((e) => e.field === 'password');
    assert.ok(passwordError, 'Should have a password validation error');
  });

  it('TC-06a: Invalid email format — missing domain', async () => {
    const res = await request('/students/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'student@',
        password: VALID_STUDENT.password,
      }),
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    const emailError = res.body.errors?.find((e) => e.field === 'email');
    assert.ok(emailError, 'Should reject invalid email format');
  });

  it('TC-06b: Invalid email format — no @ symbol', async () => {
    const res = await request('/students/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'student',
        password: VALID_STUDENT.password,
      }),
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    const emailError = res.body.errors?.find((e) => e.field === 'email');
    assert.ok(emailError, 'Should reject email without @ symbol');
  });

  it('TC-06c: Invalid email format — domain only', async () => {
    const res = await request('/students/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'abc.com',
        password: VALID_STUDENT.password,
      }),
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    const emailError = res.body.errors?.find((e) => e.field === 'email');
    assert.ok(emailError, 'Should reject domain-only string');
  });

  it('TC-07: Unauthenticated access to protected dashboard', async () => {
    const res = await request('/students/dashboard', {
      method: 'GET',
      // No Authorization header
    });

    assert.equal(res.status, 401, 'Should return 401 Unauthorized');
    assert.equal(res.body.success, false);
  });

  it('TC-09a: Invalid token — malformed JWT', async () => {
    const res = await request('/students/dashboard', {
      method: 'GET',
      headers: { Authorization: 'Bearer invalid.token.value' },
    });

    assert.equal(res.status, 401, 'Should return 401 for invalid token');
    assert.equal(res.body.success, false);
  });

  it('TC-09b: Invalid token — expired or tampered', async () => {
    // Use a well-formed but invalid JWT
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ.invalid_signature';
    const res = await request('/students/dashboard', {
      method: 'GET',
      headers: { Authorization: `Bearer ${fakeToken}` },
    });

    assert.equal(res.status, 401, 'Should return 401 for tampered/expired token');
    assert.equal(res.body.success, false);
  });

  it('TC-09c: Missing Bearer prefix', async () => {
    const loginRes = await request('/students/login', {
      method: 'POST',
      body: JSON.stringify({
        email: VALID_STUDENT.email,
        password: VALID_STUDENT.password,
      }),
    });
    const token = loginRes.body.data.token;

    const res = await request('/students/dashboard', {
      method: 'GET',
      headers: { Authorization: token }, // Missing 'Bearer ' prefix
    });

    assert.equal(res.status, 401, 'Should return 401 without Bearer prefix');
    assert.equal(res.body.success, false);
  });
});

// ═══════════════════════════════════════════════════════
// BOUNDARY / EDGE TESTS
// ═══════════════════════════════════════════════════════

describe('AISP-2: Student Login — Boundary & Edge Tests', () => {

  it('EDGE-01: Email with leading/trailing whitespace should still match', async () => {
    const res = await request('/students/login', {
      method: 'POST',
      body: JSON.stringify({
        email: '  logintest@example.com  ',
        password: VALID_STUDENT.password,
      }),
    });

    // express-validator trims email, so this should succeed
    assert.equal(res.status, 200, 'Login should succeed with trimmed email');
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
  });

  it('EDGE-02: Password at exact minimum length (8 chars) — used during registration', async () => {
    // VALID_STUDENT.password is 'Test@1234' (9 chars). 
    // This test verifies that password AT minimum length works if account exists.
    // We create a temp student with 8-char password
    const minPwdStudent = {
      name: 'MinPwd Student',
      email: 'minpwd@example.com',
      password: 'Ab@12345',  // exactly 8 characters
    };

    await Student.deleteOne({ email: minPwdStudent.email });
    await Student.create(minPwdStudent);

    try {
      const res = await request('/students/login', {
        method: 'POST',
        body: JSON.stringify({
          email: minPwdStudent.email,
          password: minPwdStudent.password,
        }),
      });

      assert.equal(res.status, 200, 'Should login with minimum-length password');
      assert.equal(res.body.success, true);
    } finally {
      await Student.deleteOne({ email: minPwdStudent.email });
    }
  });

  it('EDGE-03: Password below minimum length (7 chars) — for a non-existent account', async () => {
    // Even short passwords should go through to the controller (login does not enforce
    // password complexity — only registration does). But a 7-char password won't match
    // any registered account, so this tests the 401 path.
    const res = await request('/students/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'noone@example.com',
        password: 'Short1!',  // 7 chars
      }),
    });

    // Login validation only checks non-empty password, not complexity
    assert.equal(res.status, 401, 'Should return 401 for unregistered email');
    assert.equal(res.body.success, false);
  });

  it('EDGE-04: Case-insensitive email matching', async () => {
    const res = await request('/students/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'LOGINTEST@EXAMPLE.COM',
        password: VALID_STUDENT.password,
      }),
    });

    assert.equal(res.status, 200, 'Email comparison should be case-insensitive');
    assert.equal(res.body.success, true);
  });

  it('EDGE-05: Both email and password empty', async () => {
    const res = await request('/students/login', {
      method: 'POST',
      body: JSON.stringify({
        email: '',
        password: '',
      }),
    });

    assert.equal(res.status, 400, 'Should return 400 for both fields empty');
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors?.length >= 2, 'Should have errors for both fields');
  });

  it('EDGE-06: Missing request body fields', async () => {
    const res = await request('/students/login', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400, 'Should return 400 for missing fields');
    assert.equal(res.body.success, false);
  });

  it('EDGE-07: Login response must never contain password hash', async () => {
    const res = await request('/students/login', {
      method: 'POST',
      body: JSON.stringify({
        email: VALID_STUDENT.email,
        password: VALID_STUDENT.password,
      }),
    });

    assert.equal(res.status, 200);
    const responseStr = JSON.stringify(res.body);
    assert.ok(!responseStr.includes('$2a$'), 'Response must not contain bcrypt hash');
    assert.ok(!responseStr.includes('$2b$'), 'Response must not contain bcrypt hash');
    assert.equal(res.body.data.student.password, undefined, 'Password field must be undefined');
  });
});
