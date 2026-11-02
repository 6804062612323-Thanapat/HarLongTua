import { Money } from '../Money';
import { SplitData, SplitStrategy } from './SplitStrategy';

/** ระบุยอดของแต่ละคนเอง */
export class ExactSplit extends SplitStrategy {
  readonly kind = 'exact';
  readonly label = 'ระบุยอดเอง';

  constructor(private readonly amounts: Record<string, number>) {
    super();
  }

  participantIds(): string[] {
    return Object.keys(this.amounts);
  }

  protected computeShares(): Map<string, Money> {
    return new Map(Object.entries(this.amounts).map(([id, satang]) => [id, Money.fromSatang(satang)]));
  }

  toJSON(): SplitData {
    return { kind: 'exact', amounts: { ...this.amounts } };
  }
}
