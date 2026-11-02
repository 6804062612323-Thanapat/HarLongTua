import { DomainError } from './DomainError';

/**
 * จำนวนเงินแบบ Immutable เก็บเป็นสตางค์ (จำนวนเต็ม)
 * จึงไม่มีปัญหาทศนิยมคลาดเคลื่อนแบบ 0.1 + 0.2
 */
export class Money {
  private readonly satang: number;

  private constructor(satang: number) {
    if (!Number.isSafeInteger(satang)) throw new DomainError('จำนวนเงินไม่ถูกต้อง');
    this.satang = satang;
  }

  static readonly ZERO = new Money(0);

  static fromSatang(satang: number): Money {
    return new Money(satang);
  }

  static fromBaht(baht: number): Money {
    return new Money(Math.round(baht * 100));
  }

  /** แปลงข้อความที่ผู้ใช้กรอก เช่น "1,250.50" */
  static parse(text: string): Money {
    const clean = text.replace(/,/g, '').trim();
    if (!/^\d+(\.\d{1,2})?$/.test(clean)) throw new DomainError('กรอกจำนวนเงินเป็นตัวเลข ทศนิยมไม่เกิน 2 ตำแหน่ง');
    return Money.fromBaht(Number(clean));
  }

  static sum(items: Money[]): Money {
    return items.reduce((total, item) => total.plus(item), Money.ZERO);
  }

  plus(other: Money): Money { return new Money(this.satang + other.satang); }
  minus(other: Money): Money { return new Money(this.satang - other.satang); }
  negate(): Money { return new Money(-this.satang); }
  abs(): Money { return new Money(Math.abs(this.satang)); }
  min(other: Money): Money { return this.satang <= other.satang ? this : other; }

  isZero(): boolean { return this.satang === 0; }
  isPositive(): boolean { return this.satang > 0; }
  isNegative(): boolean { return this.satang < 0; }
  equals(other: Money): boolean { return this.satang === other.satang; }
  compareTo(other: Money): number { return this.satang - other.satang; }

  toSatang(): number { return this.satang; }
  toBaht(): number { return this.satang / 100; }

  format(): string {
    return this.toBaht().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * แบ่งเงินตามน้ำหนักด้วยวิธี Largest Remainder
   * ผลรวมของทุกส่วนเท่ากับยอดเดิมพอดีเสมอ ไม่มีสตางค์หาย
   */
  allocate(weights: number[]): Money[] {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    if (weights.length === 0 || totalWeight <= 0 || weights.some((w) => w < 0)) {
      throw new DomainError('น้ำหนักการแบ่งเงินไม่ถูกต้อง');
    }
    const exact = weights.map((w) => (this.satang * w) / totalWeight);
    const shares = exact.map(Math.floor);
    let left = this.satang - shares.reduce((a, b) => a + b, 0);
    const byRemainder = exact
      .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
      .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (let i = 0; left > 0; i = (i + 1) % byRemainder.length, left--) {
      shares[byRemainder[i].index]++;
    }
    return shares.map((s) => new Money(s));
  }
}
