import { DomainError } from '../DomainError';
import { Money } from '../Money';
import { SplitStrategy } from '../split/SplitStrategy';
import { Debt, Transaction, TransactionData } from './Transaction';

export interface ExpenseProps {
  id: string; date: string; createdBy: string;
  title: string; category: string; amount: Money; payerId: string; split: SplitStrategy;
}

/** ค่าใช้จ่าย: คนหนึ่งจ่ายไปก่อน คนที่ร่วมหารจึงเป็นหนี้คนนั้น */
export class Expense extends Transaction {
  readonly title: string;
  readonly category: string;
  readonly amount: Money;
  readonly payerId: string;
  readonly split: SplitStrategy; // Composition: ค่าใช้จ่ายมีวิธีหารของตัวเอง

  constructor(props: ExpenseProps) {
    super(props.id, props.date, props.createdBy);
    this.title = props.title.trim();
    if (!this.title) throw new DomainError('กรอกชื่อรายการ');
    this.amount = props.split.resolveTotal(props.amount);
    if (!this.amount.isPositive()) throw new DomainError('ยอดเงินต้องมากกว่า 0');
    this.category = props.category;
    this.payerId = props.payerId;
    this.split = props.split;
    this.split.split(this.amount); // ตรวจตั้งแต่สร้าง ไม่ให้มีค่าใช้จ่ายที่หารไม่ลงตัว
  }

  shares(): Map<string, Money> {
    return this.split.split(this.amount);
  }

  debts(): Debt[] {
    return [...this.shares()]
      .filter(([id, share]) => id !== this.payerId && share.isPositive())
      .map(([id, share]) => ({ debtorId: id, creditorId: this.payerId, amount: share }));
  }

  involves(memberId: string): boolean {
    return this.payerId === memberId || this.split.participantIds().includes(memberId);
  }

  toJSON(): TransactionData {
    return {
      type: 'expense', id: this.id, date: this.date, createdBy: this.createdBy, title: this.title,
      category: this.category, amountSatang: this.amount.toSatang(), payerId: this.payerId, split: this.split.toJSON(),
    };
  }
}
