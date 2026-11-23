const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Report = require('../src/models/Report');
const Area = require('../src/models/Area');
const Client = require('../src/models/Client');
const { ROLES } = require('../src/constants/roles');

let mongoServer;
let adminToken = '';
let officerToken = '';

jest.setTimeout(60000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    directConnection: true,
    driverInfo: { name: 'Mongoose', version: '9.12.3' }
  });
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 60000);

describe('eSigns Backend End-to-End Test Suite', () => {
  test('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('2.0.0');
  });

  test('POST /api/auth/setup-admin should create first administrator', async () => {
    const res = await request(app).post('/api/auth/setup-admin').send({
      username: 'admin',
      password: 'AdminPassword123!',
      email: 'admin@esigns.vic.gov.au',
      name: 'System Admin'
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    adminToken = res.body.token;
  });

  test('POST /api/auth/setup-admin should reject subsequent setup requests', async () => {
    const res = await request(app).post('/api/auth/setup-admin').send({
      username: 'hacker',
      password: 'HackerPassword123!',
      email: 'hacker@esigns.vic.gov.au'
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/login should authenticate administrator', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'AdminPassword123!'
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe(ROLES.ADMIN);
    expect(res.body.token).toBeDefined();
    adminToken = res.body.token;
  });

  test('POST /api/users should allow Admin to create Field Officer', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Sarah Nguyen',
        officerNo: '1042',
        username: 'sarah.nguyen',
        password: 'OfficerPassword123!',
        email: 'sarah.nguyen@esigns.vic.gov.au'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.officerNo).toBe('1042');
  });

  test('POST /api/auth/login should authenticate Field Officer', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'sarah.nguyen',
      password: 'OfficerPassword123!'
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe(ROLES.OFFICER);
    officerToken = res.body.token;
  });

  test('RBAC: Field Officer cannot create an Area (Forbidden)', async () => {
    const res = await request(app)
      .post('/api/areas')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        code: '32200',
        name: 'Geelong Waterfront',
        suburbs: ['Geelong']
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('Zod Validation: Malformed 4-digit Area code rejected', async () => {
    const res = await request(app)
      .post('/api/areas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: '1234', // invalid: requires exactly 5 digits
        name: 'Test Area',
        suburbs: ['Geelong']
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  test('POST /api/areas should allow Admin to create valid 5-digit Area', async () => {
    const res = await request(app)
      .post('/api/areas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: '32200',
        name: 'Geelong CBD & Waterfront',
        suburbs: ['Geelong'],
        poly: [
          [-38.145, 144.355],
          [-38.145, 144.37],
          [-38.155, 144.37],
          [-38.155, 144.355]
        ]
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('32200');
  });

  test('POST /api/reports should create sign report with auto-calculated area and officer', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        ref: '261122TEST01',
        code: 'SGN-TEST-0001',
        client: 'City of Greater Geelong',
        suburb: 'Geelong',
        street: 'Ryrie Street',
        from: 'Bellerine Street',
        to: 'Yarra Street',
        side: 'North',
        address: '120 Ryrie Street',
        gps: '-38.149918, 144.361715',
        notes: 'Sign pole stable and clear',
        signs: [
          {
            type: 'Parking Restrictions',
            conds: [
              {
                rule: '1P Meter',
                arrow: '↔',
                day: 'Mon–Fri',
                time: '9am–5pm'
              }
            ]
          }
        ]
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ref).toBe('261122TEST01');
    expect(res.body.data.officer.name).toBe('Sarah Nguyen');
    expect(res.body.data.areaCode).toBe('32200'); // Auto-detected from polygon coordinates!
  });

  test('GET /api/reports should list reports with filters', async () => {
    const res = await request(app).get('/api/reports?suburb=Geelong');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].ref).toBe('261122TEST01');
  });

  test('GET /api/reports/dashboard/stats should return valid KPIs', async () => {
    const res = await request(app).get('/api/reports/dashboard/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.totalReports).toBe(1);
    expect(res.body.stats.suburbsCovered).toBe(1);
    expect(res.body.stats.areasDefined).toBe(1);
  });

  test('GET /api/reports/export/csv should return CSV content', async () => {
    const res = await request(app).get('/api/reports/export/csv');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('261122TEST01');
    expect(res.text).toContain('Ryrie Street');
  });
});
