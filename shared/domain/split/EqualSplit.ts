import { Money } from '../Money';
import { SplitData, SplitStrategy } from './SplitStrategy';

/** หารเท่ากันทุกคน */
export class EqualSplit extends SplitStrategy {
  readonly kind = 'equal';
  readonly label = 'หารเท่ากัน';

  constructor(private readonly ids: string[]) {
    super();
  }

  participantIds(): string[] {
    return [...this.ids];
  }

  protected computeShares(total: Money): Map<string, Money> {
    return this.allocateByWeight(total, this.ids, this.ids.map(() => 1));
  }

  toJSON(): SplitData {
    return { kind: 'equal', participantIds: [...this.ids] };
  }
}
