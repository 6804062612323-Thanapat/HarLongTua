import { describe, expect, it } from 'vitest';
import generatePayload from 'promptpay-qr';
import { Group } from '../shared/domain/Group';
import { Member } from '../shared/domain/Member';
import { Money } from '../shared/domain/Money';
import { PromptPayPayload } from '../shared/domain/PromptPayPayload';
import { EqualSplit } from '../shared/domain/split/EqualSplit';
import { ExactSplit } from '../shared/domain/split/ExactSplit';
import { ItemizedSplit } from '../shared/domain/split/ItemizedSplit';
import { PercentSplit } from '../shared/domain/split/PercentSplit';
import { ShareSplit } from '../shared/domain/split/ShareSplit';
import { SplitStrategy } from '../shared/domain/split/SplitStrategy';
import { Expense } from '../shared/domain/transaction/Expense';
import { Payment } from '../shared/domain/transaction/Payment';
import { CsvExporter } from '../shared/export/CsvExporter';

const baht = (n: number) => Money.fromBaht(n);

function makeGroup(names: string[]): Group {
  const g = new Group('g', 'ทริป', 'u', 'code', 0, '2026-01-01');
  names.forEach((n, i) => g.addMember(new Member(n, n, i)));
  return g;
}

let seq = 0;
function pay(g: Group, payer: string, amount: number, split: SplitStrategy): void {
  seq++;
  g.saveTransaction(new Expense({
    id: `e${seq}`, date: `2026-01-${String(seq % 28 + 1).padStart(2, '0')}`, createdBy: 'u',
    title: 'x', category: 'food', amount: baht(amount), payerId: payer, split,
  }));
}

describe('Money', () => {
  it('ไม่มีปัญหาทศนิยมและแปลงข้อความได้', () => {
    expect(baht(0.1).plus(baht(0.2)).equals(baht(0.3))).toBe(true);
    expect(Money.parse('1,250.50').toSatang()).toBe(125050);
    expect(() => Money.parse('12.345')).toThrow();
    expect(() => Money.parse('abc')).toThrow();
  });

  it('แบ่ง 100 บาทให้ 3 คน สตางค์ไม่หาย', () => {
    const parts = baht(100).allocate([1, 1, 1]).map((m) => m.toSatang());
    expect(parts).toEqual([3334, 3333, 3333]);
  });

  it('สุ่มยอดและน้ำหนัก ผลรวมต้องเท่าเดิมเสมอ', () => {
    for (let i = 0; i < 500; i++) {
      const total = Money.fromSatang(Math.floor(Math.random() * 10_000_000));
      const weights = Array.from({ length: 1 + Math.floor(Math.random() * 12) }, () => 1 + Math.random() * 50);
      expect(Money.sum(total.allocate(weights)).equals(total)).toBe(true);
    }
  });
});

describe('วิธีหารทั้ง 5 แบบ', () => {
  it('เท่ากัน', () => {
    expect(new EqualSplit(['a', 'b', 'c']).split(baht(100)).get('a')!.toSatang()).toBe(3334);
  });
  it('ระบุยอดเอง ต้องรวมได้เท่ายอดบิล', () => {
    const s = new ExactSplit({ a: 6000, b: 4000 });
    expect(s.split(baht(100)).get('b')!.toSatang()).toBe(4000);
    expect(() => s.split(baht(99))).toThrow(/รวมกันต้องเท่ากับ/);
  });
  it('เปอร์เซ็นต์ ต้องรวมได้ 100', () => {
    expect(new PercentSplit({ a: 70, b: 30 }).split(baht(1000)).get('a')!.toBaht()).toBe(700);
    expect(() => new PercentSplit({ a: 70, b: 20 }).split(baht(1000))).toThrow(/100/);
  });
  it('ส่วนแบ่ง', () => {
    expect(new ShareSplit({ a: 2, b: 1, c: 1 }).split(baht(1000)).get('a')!.toBaht()).toBe(500);
  });
  it('แยกตามรายการ พร้อม Service 10% และ VAT 7%', () => {
    const s = new ItemizedSplit([
      { name: 'สเต็ก', priceSatang: 40000, participantIds: ['a'] },
      { name: 'สลัด', priceSatang: 20000, participantIds: ['a', 'b'] },
    ], 10, 7);
    const total = s.resolveTotal();
    expect(total.toBaht()).toBe(706.2); // 600 x 1.10 x 1.07
    const shares = s.split(total);
    expect(shares.get('a')!.plus(shares.get('b')!).equals(total)).toBe(true);
    expect(shares.get('a')!.toBaht()).toBeCloseTo(588.5, 1); // 500/600 ของยอดรวม
  });
  it('รายการที่ไม่มีคนร่วมจ่ายถูกปฏิเสธ', () => {
    expect(() => new ItemizedSplit([{ name: 'x', priceSatang: 100, participantIds: [] }], 0, 0)).toThrow();
  });
});

describe('Group และการโอน', () => {
  it('ยอดคงเหลือทุกคนรวมกันเป็นศูนย์', () => {
    const g = makeGroup(['a', 'b', 'c', 'd']);
    pay(g, 'a', 100, new EqualSplit(['a', 'b', 'c']));
    pay(g, 'b', 333.33, new ShareSplit({ a: 1, b: 2, d: 3 }));
    const sum = Money.sum(g.ledger().entries().map(([, b]) => b));
    expect(sum.isZero()).toBe(true);
  });

  it('ลดการโอนลงได้ และโอนตามแผนแล้วทุกคนเหลือศูนย์', () => {
    const g = makeGroup(['a', 'b', 'c', 'd']);
    const all = ['a', 'b', 'c', 'd'];
    pay(g, 'a', 400, new EqualSplit(all));
    pay(g, 'b', 800, new EqualSplit(all));
    pay(g, 'c', 200, new EqualSplit(all));
    const transfers = g.settle();
    expect(transfers.length).toBeLessThan(g.directTransferCount());
    transfers.forEach((t, i) => g.saveTransaction(new Payment(`p${i}`, '2026-02-01', 'u', t.fromId, t.toId, t.amount)));
    expect(g.ledger().entries().every(([, b]) => b.isZero())).toBe(true);
    expect(g.isSettled()).toBe(true);
    expect(g.settle()).toEqual([]);
  });

  it('สุ่มหลายร้อยกลุ่ม แผนการโอนต้องทำให้เหลือศูนย์เสมอ และไม่เกิน n-1 ครั้ง', () => {
    for (let round = 0; round < 300; round++) {
      const ids = Array.from({ length: 2 + Math.floor(Math.random() * 9) }, (_, i) => `m${i}`);
      const g = makeGroup(ids);
      for (let i = 0; i < 10; i++) {
        pay(g, ids[Math.floor(Math.random() * ids.length)], 1 + Math.random() * 3000, new EqualSplit(ids));
      }
      const transfers = g.settle();
      expect(transfers.length).toBeLessThanOrEqual(ids.length - 1);
      transfers.forEach((t, i) => g.saveTransaction(new Payment(`p${round}-${i}`, '2026-02-01', 'u', t.fromId, t.toId, t.amount)));
      expect(g.ledger().entries().every(([, b]) => b.isZero())).toBe(true);
    }
  });

  it('ลบสมาชิกที่มีรายการไม่ได้ และจ่ายให้คนนอกกลุ่มไม่ได้', () => {
    const g = makeGroup(['a', 'b']);
    pay(g, 'a', 100, new EqualSplit(['a', 'b']));
    expect(() => g.removeMember('b')).toThrow();
    expect(() => pay(g, 'a', 100, new EqualSplit(['a', 'ghost']))).toThrow();
  });

  it('แปลงเป็น JSON แล้วกลับมาได้ผลเหมือนเดิม', () => {
    const g = makeGroup(['a', 'b', 'c']);
    pay(g, 'a', 99.99, new EqualSplit(['a', 'b', 'c']));
    pay(g, 'b', 0, new ItemizedSplit([{ name: 'ก', priceSatang: 12345, participantIds: ['a', 'c'] }], 10, 7));
    const copy = Group.fromJSON(JSON.parse(JSON.stringify(g.toJSON())));
    expect(copy.toJSON()).toEqual(JSON.parse(JSON.stringify(g.toJSON())));
    expect(copy.settle().map((t) => t.amount.toSatang())).toEqual(g.settle().map((t) => t.amount.toSatang()));
  });
});

describe('PromptPay', () => {
  it.each([
    ['0812345678', undefined], ['0812345678', 420], ['0899999999', 1234.5],
    ['1234567890123', 15.75], ['123456789012345', 100],
  ])('ตรงกับไลบรารี promptpay-qr: %s %s', (target, amount) => {
    const mine = new PromptPayPayload(target, amount === undefined ? undefined : baht(amount)).toString();
    expect(mine).toBe(generatePayload(target, amount === undefined ? {} : { amount }));
  });
  it('ปฏิเสธเลขที่ไม่ถูกต้อง', () => {
    expect(() => new PromptPayPayload('12345')).toThrow();
    expect(() => new Member('x', 'x', 0, undefined, '123')).toThrow();
  });
});

describe('CSV', () => {
  it('กันสูตร Excel และใส่ BOM', () => {
    const g = makeGroup(['a', 'b']);
    g.saveTransaction(new Expense({ id: 'x', date: '2026-01-01', createdBy: 'u', title: '=HACK()', category: 'food', amount: baht(10), payerId: 'a', split: new EqualSplit(['a', 'b']) }));
    const csv = new CsvExporter().export(g);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain(`"'=HACK()"`);
  });
});
