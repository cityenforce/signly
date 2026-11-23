const { test, before, after, describe } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const { ROLES } = require('../src/constants/roles');
const Attachment = require('../src/models/Attachment');
const User = require('../src/models/User');
const Report = require('../src/models/Report');

let mongoServer;
let adminToken = '';
let officerToken = '';
let secondOfficerToken = '';
let officerUserId = '';

describe('Signly Backend End-to-End Test Suite (Native Runner)', () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.version, '2.0.0');
  });

  test('POST /api/auth/setup-admin should create first administrator', async () => {
    const res = await request(app).post('/api/auth/setup-admin').send({
      username: 'admin',
      password: 'AdminPassword123!',
      email: 'admin@signly.vic.gov.au',
      name: 'System Admin'
    });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token);
    adminToken = res.body.token;
  });

  test('POST /api/auth/setup-admin should reject subsequent setup requests', async () => {
    const res = await request(app).post('/api/auth/setup-admin').send({
      username: 'hacker',
      password: 'HackerPassword123!',
      email: 'hacker@signly.vic.gov.au'
    });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  test('POST /api/auth/login should authenticate administrator', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'AdminPassword123!'
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.role, 'admin');
  });

  test('POST /api/users should allow Admin to create Field Officer', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'officer1',
        password: 'OfficerPassword123!',
        email: 'sarah.nguyen@signly.vic.gov.au',
        name: 'Sarah Nguyen',
        officerNo: '042',
        role: ROLES.OFFICER
      });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.username, 'officer1');
    assert.strictEqual(res.body.data.officerNo, '042');
    officerUserId = res.body.data._id;
  });

  test('POST /api/auth/login should authenticate Field Officer', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'officer1',
      password: 'OfficerPassword123!'
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.role, 'officer');
    officerToken = res.body.token;
  });

  test('POST /api/users should allow Admin to create second Field Officer', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'officer2',
        password: 'OfficerPassword123!',
        email: 'john.doe@signly.vic.gov.au',
        name: 'John Doe',
        officerNo: '043',
        role: ROLES.OFFICER
      });

    assert.strictEqual(res.statusCode, 201);
    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'officer2',
      password: 'OfficerPassword123!'
    });
    secondOfficerToken = loginRes.body.token;
  });

  test('RBAC: Field Officer cannot create an Area (Forbidden)', async () => {
    const res = await request(app)
      .post('/api/areas')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        code: '32200',
        name: 'Geelong Central',
        suburbs: ['Geelong']
      });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
  });

  test('Zod Validation: Malformed 4-digit Area code rejected with 400', async () => {
    const res = await request(app)
      .post('/api/areas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: '3220', // Must be strictly 5 digits: ^\d{5}$
        name: 'Invalid Sector',
        suburbs: ['Geelong']
      });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  test('POST /api/areas should allow Admin to create valid 5-digit Area', async () => {
    const res = await request(app)
      .post('/api/areas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: '32200',
        name: 'Geelong Waterfront & CBD',
        suburbs: ['Geelong'],
        poly: [
          [-38.140, 144.350],
          [-38.140, 144.375],
          [-38.160, 144.375],
          [-38.160, 144.350]
        ]
      });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.code, '32200');
  });

  test('POST /api/reports should create sign report with auto-calculated area and officer attribution', async () => {
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

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.ref, '261122TEST01');
    assert.strictEqual(res.body.data.officer.name, 'Sarah Nguyen');
    assert.strictEqual(res.body.data.areaCode, '32200'); // Auto-detected by polygon containment!
  });

  test('GET /api/reports should filter reports by suburb', async () => {
    const res = await request(app).get('/api/reports?suburb=Geelong');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.count, 1);
    assert.strictEqual(res.body.data[0].ref, '261122TEST01');
  });

  test('GET /api/reports/dashboard/stats should return real aggregated KPIs', async () => {
    const res = await request(app).get('/api/reports/dashboard/stats');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.stats.totalReports, 1);
    assert.strictEqual(res.body.stats.suburbsCovered, 1);
    assert.strictEqual(res.body.stats.areasDefined, 1);
  });

  test('GET /api/reports/export/csv should return CSV content with header and record', async () => {
    const res = await request(app).get('/api/reports/export/csv');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.headers['content-type'].includes('text/csv'));
    assert.ok(res.text.includes('261122TEST01'));
    assert.ok(res.text.includes('Ryrie Street'));
    assert.ok(res.text.includes('Sarah Nguyen'));
  });

  let createdAttachmentId = '';
  let createdAttachmentKey = '';

  test('POST /api/upload should upload attachment, validate MIME, and save metadata in MongoDB', async () => {
    const dummyImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${officerToken}`)
      .field('reportRef', '261122TEST01')
      .field('category', 'sign_photo')
      .field('isPublic', 'false')
      .field('notes', 'Clear front view of Ryrie St sign')
      .attach('file', dummyImageBuffer, 'ryrie_sign.png');

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.attachment.key);
    assert.ok(res.body.attachment.viewUrl);
    assert.strictEqual(res.body.attachment.reportRef, '261122TEST01');
    assert.strictEqual(res.body.attachment.category, 'sign_photo');
    assert.strictEqual(res.body.attachment.isPublic, false);
    createdAttachmentId = res.body.attachment.id;
    createdAttachmentKey = res.body.attachment.key;

    // Verify metadata persisted in MongoDB Atlas schema
    const doc = await Attachment.findById(createdAttachmentId);
    assert.ok(doc);
    assert.strictEqual(doc.filename, 'ryrie_sign.png');
    assert.strictEqual(doc.mimeType, 'image/png');
    assert.strictEqual(doc.size, dummyImageBuffer.length);
  });

  test('GET /api/upload/:id should reject unauthorized user from accessing private image', async () => {
    // Second officer (not owner and not admin) attempts to access private attachment
    const res = await request(app)
      .get(`/api/upload/${createdAttachmentId}`)
      .set('Authorization', `Bearer ${secondOfficerToken}`);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
  });

  test('GET /api/upload/:id should allow owner or admin to access attachment metadata and viewing URL', async () => {
    const res = await request(app)
      .get(`/api/upload/${createdAttachmentId}`)
      .set('Authorization', `Bearer ${officerToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.attachment._id, createdAttachmentId);
    assert.ok(res.body.attachment.viewUrl);
  });

  test('GET /api/upload/report/:reportRef should list all attachments for report', async () => {
    const res = await request(app)
      .get('/api/upload/report/261122TEST01')
      .set('Authorization', `Bearer ${officerToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.count, 1);
    assert.strictEqual(res.body.attachments[0].filename, 'ryrie_sign.png');
    assert.ok(res.body.attachments[0].viewUrl);
  });

  test('Profile Avatar: POST /api/users/profile/avatar should upload and replace avatar with R2 cleanup', async () => {
    const avatar1 = Buffer.from('avatar-1-dummy-image-data');
    const avatar2 = Buffer.from('avatar-2-dummy-image-data-replacement');

    // 1. Initial Avatar Upload
    const res1 = await request(app)
      .post('/api/users/profile/avatar')
      .set('Authorization', `Bearer ${officerToken}`)
      .attach('avatar', avatar1, 'profile1.jpg');

    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res1.body.success, true);
    const firstAvatarKey = res1.body.avatarKey;
    assert.ok(firstAvatarKey.startsWith(`users/${officerUserId}/profile/`));

    // Verify user document in MongoDB has avatar and avatarKey
    const u1 = await User.findById(officerUserId);
    assert.strictEqual(u1.avatarKey, firstAvatarKey);

    // 2. Replacement Avatar Upload
    const res2 = await request(app)
      .post('/api/users/profile/avatar')
      .set('Authorization', `Bearer ${officerToken}`)
      .attach('avatar', avatar2, 'profile2.jpg');

    assert.strictEqual(res2.statusCode, 200);
    const secondAvatarKey = res2.body.avatarKey;
    assert.notStrictEqual(secondAvatarKey, firstAvatarKey);

    // Verify old avatar was cleaned up from MongoDB Attachment records
    const oldAtt = await Attachment.findOne({ key: firstAvatarKey });
    assert.strictEqual(oldAtt, null);

    // 3. Delete Profile Avatar
    const delRes = await request(app)
      .delete('/api/users/profile/avatar')
      .set('Authorization', `Bearer ${officerToken}`);

    assert.strictEqual(delRes.statusCode, 200);
    const uAfterDel = await User.findById(officerUserId);
    assert.strictEqual(uAfterDel.avatarKey, '');
  });

  test('POST /api/reports with base64 image should auto-upload to R2 and store metadata in MongoDB', async () => {
    const base64Pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        ref: '261122TEST02',
        code: 'SGN-TEST-0002',
        client: 'City of Greater Geelong',
        suburb: 'Geelong',
        street: 'Moorabool Street',
        side: 'East',
        signs: [{ type: 'Parking', conds: [{ rule: '2P', arrow: '←', day: 'All days', time: 'All times' }] }],
        photos: [base64Pixel]
      });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.photoCount, 1);
    assert.ok(res.body.data.photoKeys.length > 0);
    assert.ok(res.body.data.photoKeys[0].startsWith('reports/261122TEST02/images/'));

    // Verify Attachment record in MongoDB
    const att = await Attachment.findOne({ reportRef: '261122TEST02' });
    assert.ok(att);
    assert.strictEqual(att.category, 'sign_photo');
  });

  test('DELETE /api/reports/:ref should delete report and clean up all R2 attachments', async () => {
    const res = await request(app)
      .delete('/api/reports/261122TEST02')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);

    // Verify attachment records cleaned up from MongoDB
    const attAfter = await Attachment.findOne({ reportRef: '261122TEST02' });
    assert.strictEqual(attAfter, null);
  });

  test('DELETE /api/upload/:id should reject non-owner and allow owner to delete attachment', async () => {
    // Unauthorized attempt
    const unauthRes = await request(app)
      .delete(`/api/upload/${createdAttachmentId}`)
      .set('Authorization', `Bearer ${secondOfficerToken}`);
    assert.strictEqual(unauthRes.statusCode, 403);

    // Authorized deletion by owner
    const res = await request(app)
      .delete(`/api/upload/${createdAttachmentId}`)
      .set('Authorization', `Bearer ${officerToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);

    const verifyRes = await request(app)
      .get(`/api/upload/${createdAttachmentId}`)
      .set('Authorization', `Bearer ${officerToken}`);
    assert.strictEqual(verifyRes.statusCode, 404);
  });
});
