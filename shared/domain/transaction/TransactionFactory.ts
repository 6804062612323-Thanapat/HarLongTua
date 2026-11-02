import { Money } from '../Money';
import { createSplit } from '../split/SplitFactory';
import { Expense } from './Expense';
import { Payment } from './Payment';
import { Transaction, TransactionData } from './Transaction';

export function createTransaction(data: TransactionData): Transaction {
  if (data.type === 'expense') {
    return new Expense({
      id: data.id, date: data.date, createdBy: data.createdBy, title: data.title, category: data.category,
      amount: Money.fromSatang(data.amountSatang), payerId: data.payerId, split: createSplit(data.split),
    });
  }
  return new Payment(data.id, data.date, data.createdBy, data.fromId, data.toId, Money.fromSatang(data.amountSatang));
}
