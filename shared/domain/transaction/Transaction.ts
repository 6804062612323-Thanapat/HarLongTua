import { Ledger } from '../Ledger';
import { Money } from '../Money';
import { SplitData } from '../split/SplitStrategy';

export interface Debt {
  debtorId: string;
  creditorId: string;
  amount: Money;
}

export type TransactionData =
  | {
      type: 'expense'; id: string; date: string; createdBy: string;
      title: string; category: string; amountSatang: number; payerId: string; split: SplitData;
    }
  | {
      type: 'payment'; id: string; date: string; createdBy: string;
      fromId: string; toId: string; amountSatang: number;
    };

/** รายการในกลุ่ม คลาสลูกบอกแค่ว่ารายการนี้ทำให้ใครเป็นหนี้ใคร */
export abstract class Transaction {
  protected constructor(readonly id: string, readonly date: string, readonly createdBy: string) {}

  abstract debts(): Debt[];
  abstract involves(memberId: string): boolean;
  abstract toJSON(): TransactionData;

  applyTo(ledger: Ledger): void {
    for (const debt of this.debts()) {
      ledger.record(debt.debtorId, debt.creditorId, debt.amount);
    }
  }
}
