import { DomainError } from '../DomainError';
import { Money } from '../Money';
import { ItemData, SplitData, SplitStrategy } from './SplitStrategy';

/** แยกตามรายการอาหาร ใครกินอะไรจ่ายตามนั้น แล้วเฉลี่ย Service Charge และ VAT ตามสัดส่วน */
export class ItemizedSplit extends SplitStrategy {
  readonly kind = 'itemized';
  readonly label = 'แยกตามรายการ';

  constructor(
    private readonly items: ItemData[],
    private readonly servicePct: number,
    private readonly vatPct: number,
  ) {
    super();
    if (items.length === 0) throw new DomainError('เพิ่มรายการอย่างน้อย 1 รายการ');
    if (items.some((item) => item.participantIds.length === 0)) {
      throw new DomainError('ทุกรายการต้องมีคนร่วมจ่ายอย่างน้อย 1 คน');
    }
  }

  participantIds(): string[] {
    return [...new Set(this.items.flatMap((item) => item.participantIds))];
  }

  /** ยอดรวมคำนวณจากรายการเอง: Service คิดจากยอดอาหาร และ VAT คิดจากยอดรวม Service */
  override resolveTotal(): Money {
    const subtotal = this.items.reduce((sum, item) => sum + item.priceSatang, 0);
    return Money.fromSatang(Math.round(subtotal * (1 + this.servicePct / 100) * (1 + this.vatPct / 100)));
  }

  protected computeShares(total: Money): Map<string, Money> {
    const before = new Map<string, number>();
    for (const item of this.items) {
      const parts = Money.fromSatang(item.priceSatang).allocate(item.participantIds.map(() => 1));
      item.participantIds.forEach((id, i) => {
        before.set(id, (before.get(id) ?? 0) + parts[i].toSatang());
      });
    }
    return this.allocateByWeight(total, [...before.keys()], [...before.values()]);
  }

  toJSON(): SplitData {
    return { kind: 'itemized', items: this.items, servicePct: this.servicePct, vatPct: this.vatPct };
  }
}
