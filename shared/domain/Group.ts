import { DomainError } from './DomainError';
import { Ledger } from './Ledger';
import { Member, MemberData } from './Member';
import { Money } from './Money';
import { DirectSettlement } from './settlement/DirectSettlement';
import { GreedySettlement } from './settlement/GreedySettlement';
import { SettlementStrategy, Transfer } from './settlement/SettlementStrategy';
import { Expense } from './transaction/Expense';
import { Transaction, TransactionData } from './transaction/Transaction';
import { createTransaction } from './transaction/TransactionFactory';

export interface GroupData {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  version: number;
  createdAt: string;
  members: MemberData[];
  transactions: TransactionData[];
}

/** กลุ่มหารเงิน เป็นเจ้าของสมาชิกและรายการทั้งหมด คลาสอื่นแก้ข้อมูลได้ผ่านเมธอดของกลุ่มเท่านั้น */
export class Group {
  private _name = '';
  private readonly members = new Map<string, Member>();
  private readonly transactions = new Map<string, Transaction>();

  constructor(
    readonly id: string, name: string, readonly ownerId: string, readonly inviteCode: string,
    readonly version: number, readonly createdAt: string,
  ) {
    this.rename(name);
  }

  get name(): string { return this._name; }

  rename(name: string): void {
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 60) throw new DomainError('ชื่อกลุ่มต้องมี 1 ถึง 60 ตัวอักษร');
    this._name = clean;
  }

  listMembers(): Member[] { return [...this.members.values()]; }
  listTransactions(): Transaction[] {
    return [...this.transactions.values()].sort((a, b) => b.date.localeCompare(a.date));
  }

  getMember(id: string): Member {
    const member = this.members.get(id);
    if (!member) throw new DomainError('ไม่พบสมาชิกคนนี้ในกลุ่ม');
    return member;
  }

  findMemberByUser(userId: string): Member | undefined {
    return this.listMembers().find((m) => m.userId === userId);
  }

  addMember(member: Member): void {
    if (this.listMembers().some((m) => m.name === member.name)) throw new DomainError(`มีชื่อ "${member.name}" ในกลุ่มแล้ว`);
    this.members.set(member.id, member);
  }

  removeMember(id: string): void {
    const member = this.getMember(id);
    if (member.userId === this.ownerId) throw new DomainError('ลบเจ้าของกลุ่มไม่ได้');
    if (this.listTransactions().some((tx) => tx.involves(id))) {
      throw new DomainError(`ลบ ${member.name} ไม่ได้ เพราะมีรายการที่เกี่ยวข้องอยู่`);
    }
    this.members.delete(id);
  }

  /** เพิ่มหรือแทนที่รายการ โดยตรวจว่าทุกคนในรายการอยู่ในกลุ่มจริง */
  saveTransaction(tx: Transaction): void {
    for (const debt of tx.debts()) {
      this.getMember(debt.debtorId);
      this.getMember(debt.creditorId);
    }
    if (tx instanceof Expense) this.getMember(tx.payerId);
    this.transactions.set(tx.id, tx);
  }

  removeTransaction(id: string): void {
    if (!this.transactions.delete(id)) throw new DomainError('ไม่พบรายการนี้');
  }

  ledger(): Ledger {
    const ledger = new Ledger(this.listMembers().map((m) => m.id));
    this.transactions.forEach((tx) => tx.applyTo(ledger));
    return ledger;
  }

  /** Polymorphism: เปลี่ยนวิธีคำนวณการโอนได้โดยส่งคลาสลูกตัวอื่นเข้ามา */
  settle(strategy: SettlementStrategy = new GreedySettlement()): Transfer[] {
    return strategy.plan(this.listMembers().map((m) => m.id), this.listTransactions());
  }

  /** จำนวนครั้งที่ต้องโอนถ้าไม่ได้ลดการโอน */
  directTransferCount(): number {
    return this.settle(new DirectSettlement()).length;
  }

  expenses(): Expense[] {
    return this.listTransactions().filter((tx): tx is Expense => tx instanceof Expense);
  }

  totalSpent(): Money {
    return Money.sum(this.expenses().map((e) => e.amount));
  }

  /** ยอดที่แต่ละคนใช้จริง (ส่วนของตัวเอง ไม่นับที่ออกให้คนอื่น) */
  spentByMember(): Map<string, Money> {
    const spent = new Map(this.listMembers().map((m) => [m.id, Money.ZERO]));
    for (const expense of this.expenses()) {
      for (const [id, share] of expense.shares()) spent.set(id, (spent.get(id) ?? Money.ZERO).plus(share));
    }
    return spent;
  }

  spentByCategory(): Map<string, Money> {
    const spent = new Map<string, Money>();
    for (const e of this.expenses()) spent.set(e.category, (spent.get(e.category) ?? Money.ZERO).plus(e.amount));
    return spent;
  }

  isSettled(): boolean {
    return this.expenses().length > 0 && this.ledger().entries().every(([, b]) => b.isZero());
  }

  toJSON(): GroupData {
    return {
      id: this.id, name: this._name, ownerId: this.ownerId, inviteCode: this.inviteCode,
      version: this.version, createdAt: this.createdAt,
      members: this.listMembers().map((m) => m.toJSON()),
      transactions: this.listTransactions().map((t) => t.toJSON()),
    };
  }

  static fromJSON(data: GroupData): Group {
    const group = new Group(data.id, data.name, data.ownerId, data.inviteCode, data.version, data.createdAt);
    data.members.forEach((m) => group.members.set(m.id, Member.fromJSON(m)));
    data.transactions.forEach((t) => group.transactions.set(t.id, createTransaction(t)));
    return group;
  }
}
