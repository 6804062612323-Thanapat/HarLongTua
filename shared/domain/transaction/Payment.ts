import { DomainError } from '../DomainError';
import { Money } from '../Money';
import { Debt, Transaction, TransactionData } from './Transaction';

/** การโอนคืน: ผู้โอนจ่ายเงินไป ผู้รับจึงเป็นหนี้ผู้โอนเท่ากับยอดนั้น ซึ่งหักล้างหนี้เดิม */
export class Payment extends Transaction {
  constructor(
    id: string, date: string, createdBy: string,
    readonly fromId: string, readonly toId: string, readonly amount: Money,
  ) {
    super(id, date, createdBy);
    if (fromId === toId) throw new DomainError('ผู้โอนและผู้รับต้องเป็นคนละคน');
    if (!amount.isPositive()) throw new DomainError('ยอดโอนต้องมากกว่า 0');
  }

  debts(): Debt[] {
    return [{ debtorId: this.toId, creditorId: this.fromId, amount: this.amount }];
  }

  involves(memberId: string): boolean {
    return this.fromId === memberId || this.toId === memberId;
  }

  toJSON(): TransactionData {
    return {
      type: 'payment', id: this.id, date: this.date, createdBy: this.createdBy,
      fromId: this.fromId, toId: this.toId, amountSatang: this.amount.toSatang(),
    };
  }
}
