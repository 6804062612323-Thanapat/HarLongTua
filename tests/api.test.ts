import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app';
import { MemoryGroupRepository, MemoryUserRepository } from '../server/repositories/MemoryRepositories';

let agent: ReturnType<typeof request.agent>;
let friend: ReturnType<typeof request.agent>;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  app = createApp({
    users: new MemoryUserRepository(), groups: new MemoryGroupRepository(),
    jwtSecret: 'x'.repeat(40), isProduction: false, rateLimitMax: 1000,
  });
  agent = request.agent(app);
  friend = request.agent(app);
  await agent.post('/api/auth/register').send({ email: 'a@test.com', password: 'password1', name: 'เอ' }).expect(201);
  await friend.post('/api/auth/register').send({ email: 'b@test.com', password: 'password2', name: 'บี' }).expect(201);
});

describe('การยืนยันตัวตน', () => {
  it('ต้องล็อกอินก่อนใช้ API', async () => {
    await request(app).get('/api/groups').expect(401);
    await request(app).get('/api/auth/me').expect(401);
  });
  it('Cookie เป็น httpOnly และคำตอบไม่มีรหัสผ่าน', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: 'password1' }).expect(200);
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/);
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);
  });
  it('รหัสผิด สมัครซ้ำ รหัสสั้น และอีเมลผิด ถูกปฏิเสธ', async () => {
    await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: 'wrongpass' }).expect(401);
    await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'wrongpass' }).expect(401);
    await request(app).post('/api/auth/register').send({ email: 'A@test.com', password: 'password1', name: 'x' }).expect(409);
    await request(app).post('/api/auth/register').send({ email: 'c@test.com', password: 'short', name: 'x' }).expect(400);
    await request(app).post('/api/auth/register').send({ email: 'nope', password: 'password1', name: 'x' }).expect(400);
  });
  it('ส่งออบเจ็กต์แทนอีเมลเพื่อโจมตี NoSQL Injection ไม่ได้', async () => {
    await request(app).post('/api/auth/login').send({ email: { $ne: '' }, password: 'x' }).expect(400);
  });
  it('Token ปลอมใช้ไม่ได้ และออกจากระบบแล้วใช้ต่อไม่ได้', async () => {
    await request(app).get('/api/groups').set('Cookie', 'hlt_session=fake').expect(401);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/groups').expect(401);
  });
});

describe('กลุ่มและสิทธิ์', () => {
  async function setup() {
    const { body } = await agent.post('/api/groups').send({ name: 'ทริปเขาใหญ่' }).expect(201);
    return body.group;
  }

  it('คนนอกกลุ่มดูหรือแก้กลุ่มไม่ได้', async () => {
    const g = await setup();
    await friend.get(`/api/groups/${g.id}`).expect(404);
    await friend.post(`/api/groups/${g.id}/members`).send({ name: 'แฮก' }).expect(404);
    await friend.delete(`/api/groups/${g.id}`).expect(404);
  });

  it('เข้ากลุ่มด้วยลิงก์เชิญ รับชื่อที่เพื่อนเพิ่มไว้ แล้วเห็นข้อมูลเดียวกัน', async () => {
    const g = await setup();
    const added = await agent.post(`/api/groups/${g.id}/members`).send({ name: 'บีบี' }).expect(201);
    const slot = added.body.group.members.find((m: any) => m.name === 'บีบี');
    const preview = await request(app).get(`/api/invites/${g.inviteCode}`).expect(200);
    expect(preview.body.name).toBe('ทริปเขาใหญ่');
    expect(JSON.stringify(preview.body)).not.toMatch(/promptPay|userId|inviteCode/);
    await friend.post(`/api/invites/${g.inviteCode}/join`).send({ memberId: slot.id }).expect(200);
    const seen = await friend.get(`/api/groups/${g.id}`).expect(200);
    expect(seen.body.group.members.find((m: any) => m.id === slot.id).userId).toBeTruthy();
    const list = await friend.get('/api/groups').expect(200);
    expect(list.body.groups).toHaveLength(1);
  });

  it('สวมชื่อที่มีเจ้าของแล้วไม่ได้', async () => {
    const g = await setup();
    await friend.post(`/api/invites/${g.inviteCode}/join`).send({ memberId: g.members[0].id }).expect(400);
  });

  it('แก้พร้อมเพย์ของคนที่มีบัญชีแล้วไม่ได้ แต่แก้ของตัวเองได้', async () => {
    const g = await setup();
    await friend.post(`/api/invites/${g.inviteCode}/join`).send({}).expect(200);
    await friend.put(`/api/groups/${g.id}/members/${g.members[0].id}`).send({ name: 'เอ', promptPayId: '0899999999' }).expect(403);
    const ok = await agent.put(`/api/groups/${g.id}/members/${g.members[0].id}`).send({ name: 'เอ', promptPayId: '081-234-5678' }).expect(200);
    expect(ok.body.group.members[0].promptPayId).toBe('0812345678');
    await agent.put(`/api/groups/${g.id}/members/${g.members[0].id}`).send({ name: 'เอ', promptPayId: '123' }).expect(400);
  });

  it('ลบกลุ่มได้เฉพาะเจ้าของ', async () => {
    const g = await setup();
    await friend.post(`/api/invites/${g.inviteCode}/join`).send({}).expect(200);
    await friend.delete(`/api/groups/${g.id}`).expect(403);
    await agent.delete(`/api/groups/${g.id}`).expect(204);
  });

  it('บันทึกค่าใช้จ่าย แก้ไข โอนคืน และลบรายการ', async () => {
    const g = await setup();
    const a = g.members[0].id;
    const withB = await agent.post(`/api/groups/${g.id}/members`).send({ name: 'บี' }).expect(201);
    const b = withB.body.group.members[1].id;
    const expense = { title: 'หมูกระทะ', category: 'food', amountSatang: 100000, payerId: a, split: { kind: 'equal', participantIds: [a, b] } };
    const r1 = await agent.post(`/api/groups/${g.id}/expenses`).send(expense).expect(201);
    const txId = r1.body.group.transactions[0].id;
    await agent.put(`/api/groups/${g.id}/expenses/${txId}`).send({ ...expense, amountSatang: 120000 }).expect(200);
    await agent.delete(`/api/groups/${g.id}/members/${b}`).expect(400);
    const r2 = await agent.post(`/api/groups/${g.id}/payments`).send({ fromId: b, toId: a, amountSatang: 60000 }).expect(201);
    expect(r2.body.group.transactions).toHaveLength(2);
    await agent.delete(`/api/groups/${g.id}/transactions/${txId}`).expect(200);
  });

  it('ข้อมูลผิดรูปแบบถูกปฏิเสธ', async () => {
    const g = await setup();
    const a = g.members[0].id;
    const post = (body: object) => agent.post(`/api/groups/${g.id}/expenses`).send(body);
    await post({ title: 'x', category: 'food', amountSatang: 100, payerId: a, split: { kind: 'magic' } }).expect(400);
    await post({ title: 'x', category: 'ไม่มี', amountSatang: 100, payerId: a, split: { kind: 'equal', participantIds: [a] } }).expect(400);
    await post({ title: 'x', category: 'food', amountSatang: -5, payerId: a, split: { kind: 'equal', participantIds: [a] } }).expect(400);
    await post({ title: 'x', category: 'food', amountSatang: 100, payerId: 'ghost', split: { kind: 'equal', participantIds: [a] } }).expect(400);
    await post({ title: 'x', category: 'food', amountSatang: 100, payerId: a, split: { kind: 'exact', amounts: { [a]: 50 } } }).expect(400);
  });

  it('API ที่ไม่มีอยู่ตอบ 404 แบบ JSON', async () => {
    const res = await agent.get('/api/nothing').expect(404);
    expect(res.body.error).toBeTruthy();
  });
});

describe('การแก้ไขรายการ', () => {
  it('คงวันที่เดิมไว้', async () => {
    const { body } = await agent.post('/api/groups').send({ name: 'x' }).expect(201);
    const a = body.group.members[0].id;
    const expense = { title: 'ข้าว', category: 'food', amountSatang: 1000, payerId: a, split: { kind: 'equal', participantIds: [a] }, date: '2026-01-05T00:00:00.000Z' };
    const r = await agent.post(`/api/groups/${body.group.id}/expenses`).send(expense).expect(201);
    const { date: _drop, ...edit } = expense;
    const edited = await agent.put(`/api/groups/${body.group.id}/expenses/${r.body.group.transactions[0].id}`).send({ ...edit, title: 'ข้าวผัด' }).expect(200);
    expect(edited.body.group.transactions[0].date).toBe('2026-01-05T00:00:00.000Z');
    expect(edited.body.group.transactions[0].title).toBe('ข้าวผัด');
  });
});
