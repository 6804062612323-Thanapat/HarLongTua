import { Money } from '../Money';
import { SplitData, SplitStrategy } from './SplitStrategy';

/** หารตามส่วนแบ่ง เช่น ค่าห้องพัก คนนอนเตียงเดี่ยวจ่าย 2 ส่วน คนนอนรวมจ่าย 1 ส่วน */
export class ShareSplit extends SplitStrategy {
  readonly kind = 'shares';
  readonly label = 'ตามส่วนแบ่ง';

  constructor(private readonly shares: Record<string, number>) {
    super();
  }

  participantIds(): string[] {
    return Object.keys(this.shares);
  }

  protected computeShares(total: Money): Map<string, Money> {
    return this.allocateByWeight(total, this.participantIds(), Object.values(this.shares));
  }

  toJSON(): SplitData {
    return { kind: 'shares', shares: { ...this.shares } };
  }
}
