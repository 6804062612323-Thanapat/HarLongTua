import { Money } from '../Money';
import { Transaction } from '../transaction/Transaction';

export interface Transfer {
  fromId: string;
  toId: string;
  amount: Money;
}

/** วิธีคำนวณว่าใครควรโอนให้ใคร */
export abstract class SettlementStrategy {
  abstract plan(memberIds: string[], transactions: readonly Transaction[]): Transfer[];
}
