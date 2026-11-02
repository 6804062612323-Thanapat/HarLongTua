import { DomainError } from '../DomainError';
import { Money } from '../Money';
import { SplitData, SplitStrategy } from './SplitStrategy';

/** หารตามเปอร์เซ็นต์ ต้องรวมกันได้ 100 */
export class PercentSplit extends SplitStrategy {
  readonly kind = 'percent';
  readonly label = 'ตามเปอร์เซ็นต์';

  constructor(private readonly percents: Record<string, number>) {
    super();
  }

  participantIds(): string[] {
    return Object.keys(this.percents);
  }

  protected computeShares(total: Money): Map<string, Money> {
    const values = Object.values(this.percents);
    const sum = values.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.001) throw new DomainError(`เปอร์เซ็นต์รวมต้องได้ 100 ตอนนี้ได้ ${sum}`);
    return this.allocateByWeight(total, this.participantIds(), values);
  }

  toJSON(): SplitData {
    return { kind: 'percent', percents: { ...this.percents } };
  }
}
