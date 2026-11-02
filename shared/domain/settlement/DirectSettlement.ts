import { Money } from '../Money';
import { SettlementStrategy, Transfer } from './SettlementStrategy';
import { Transaction } from '../transaction/Transaction';

/** ไม่ลดการโอน: ใครติดหนี้ใครก็โอนให้คนนั้นโดยตรง ใช้เป็นตัวเปรียบเทียบ */
export class DirectSettlement extends SettlementStrategy {
  plan(_memberIds: string[], transactions: readonly Transaction[]): Transfer[] {
    const net = new Map<string, Money>();
    const key = (a: string, b: string) => `${a}|${b}`;
    for (const tx of transactions) {
      for (const { debtorId, creditorId, amount } of tx.debts()) {
        const k = key(debtorId, creditorId);
        const opposite = key(creditorId, debtorId);
        const existing = net.get(opposite);
        if (existing) {
          const left = existing.minus(amount);
          net.delete(opposite);
          if (left.isPositive()) net.set(opposite, left);
          else if (left.isNegative()) net.set(k, left.abs());
        } else {
          net.set(k, (net.get(k) ?? Money.ZERO).plus(amount));
        }
      }
    }
    return [...net.entries()].map(([k, amount]) => {
      const [fromId, toId] = k.split('|');
      return { fromId, toId, amount };
    });
  }
}
