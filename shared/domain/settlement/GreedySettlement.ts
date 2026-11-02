import { Ledger } from '../Ledger';
import { Money } from '../Money';
import { Transaction } from '../transaction/Transaction';
import { SettlementStrategy, Transfer } from './SettlementStrategy';

/**
 * ลดจำนวนครั้งการโอนด้วยอัลกอริทึมแบบ Greedy
 * ให้คนที่ติดลบมากที่สุดโอนให้คนที่เป็นบวกมากที่สุด ทำซ้ำจนยอดเป็นศูนย์ทุกคน
 */
export class GreedySettlement extends SettlementStrategy {
  plan(memberIds: string[], transactions: readonly Transaction[]): Transfer[] {
    const ledger = new Ledger(memberIds);
    transactions.forEach((tx) => tx.applyTo(ledger));

    const creditors = ledger.entries().filter(([, b]) => b.isPositive());
    const debtors = ledger.entries().filter(([, b]) => b.isNegative()).map(([id, b]) => [id, b.abs()] as [string, Money]);
    const largestFirst = (a: [string, Money], b: [string, Money]) => b[1].compareTo(a[1]);

    const transfers: Transfer[] = [];
    while (creditors.length > 0 && debtors.length > 0) {
      creditors.sort(largestFirst);
      debtors.sort(largestFirst);
      const [toId, credit] = creditors[0];
      const [fromId, debt] = debtors[0];
      const amount = credit.min(debt);
      transfers.push({ fromId, toId, amount });
      creditors[0] = [toId, credit.minus(amount)];
      debtors[0] = [fromId, debt.minus(amount)];
      if (creditors[0][1].isZero()) creditors.shift();
      if (debtors[0][1].isZero()) debtors.shift();
    }
    return transfers;
  }
}
