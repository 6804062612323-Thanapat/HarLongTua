import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Member } from '../shared/domain/Member';
import { Money } from '../shared/domain/Money';
import { EqualSplit } from '../shared/domain/split/EqualSplit';
import { Expense } from '../shared/domain/transaction/Expense';
import { MongoGroupRepository, MongoUserRepository } from '../server/repositories/MongoRepositories';

/** เทสต์กับฐานข้อมูลจริง รันเมื่อตั้งค่า TEST_MONGODB_URI เท่านั้น */
const uri = process.env.TEST_MONGODB_URI;

describe.skipIf(!uri)('MongoDB repositories', () => {
  const groups = new MongoGroupRepository();
  const users = new MongoUserRepository();

  beforeAll(async () => { await mongoose.connect(uri!); });
  afterAll(async () => { await mongoose.disconnect(); });

  it('อีเมลซ้ำถูกปฏิเสธ', async () => {
    const email = `dup${Date.now()}@test.com`;
    await users.create({ email, name: 'a', passwordHash: 'x' });
    expect((await users.findByEmail(email))?.name).toBe('a');
    await expect(users.create({ email, name: 'b', passwordHash: 'x' })).rejects.toThrow(/สมัครไว้แล้ว/);
  });

  it('บันทึกแล้วอ่านกลับมาได้ครบ และกันการเขียนทับเมื่อแก้พร้อมกัน', async () => {
    const created = await groups.create({
      name: 'ทดสอบ', ownerId: 'u1', inviteCode: `code${Date.now()}`, transactions: [],
      members: [new Member('a', 'เอ', 0, 'u1').toJSON(), new Member('b', 'บี', 1).toJSON()],
    });
    const first = (await groups.findById(created.id))!;
    const second = (await groups.findById(created.id))!;
    first.saveTransaction(new Expense({
      id: 'e1', date: '2026-01-01T00:00:00.000Z', createdBy: 'u1', title: 'ข้าว', category: 'food',
      amount: Money.fromBaht(100), payerId: 'a', split: new EqualSplit(['a', 'b']),
    }));
    expect(await groups.save(first)).toBe(true);
    expect(await groups.save(second)).toBe(false); // version เก่า ต้องบันทึกไม่ได้
    const loaded = (await groups.findById(created.id))!;
    expect(loaded.version).toBe(1);
    expect(loaded.settle()[0].amount.toBaht()).toBe(50);
    expect((await groups.findByUser('u1')).some((g) => g.id === created.id)).toBe(true);
    await groups.delete(created.id);
    expect(await groups.findById(created.id)).toBeNull();
  });
});
