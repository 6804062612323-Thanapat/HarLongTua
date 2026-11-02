import { Money } from './Money';

/** สมุดบัญชีของกลุ่ม ค่าบวก = มีคนต้องจ่ายให้ ค่าลบ = ต้องจ่ายให้คนอื่น */
export class Ledger {
  private readonly balances = new Map<string, Money>();

  constructor(memberIds: string[]) {
    memberIds.forEach((id) => this.balances.set(id, Money.ZERO));
  }

  record(debtorId: string, creditorId: string, amount: Money): void {
    this.balances.set(debtorId, this.balanceOf(debtorId).minus(amount));
    this.balances.set(creditorId, this.balanceOf(creditorId).plus(amount));
  }

  balanceOf(memberId: string): Money {
    return this.balances.get(memberId) ?? Money.ZERO;
  }

  entries(): [string, Money][] {
    return [...this.balances.entries()];
  }
}
