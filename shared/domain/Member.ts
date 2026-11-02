import { DomainError } from './DomainError';
import { isValidPromptPayTarget } from './PromptPayPayload';

export interface MemberData {
  id: string;
  name: string;
  color: number;
  userId?: string;
  promptPayId?: string;
}

/** สมาชิกในกลุ่ม อาจยังไม่มีบัญชีผู้ใช้ก็ได้ (userId ว่าง = เพื่อนที่ยังไม่ได้เข้าเว็บ) */
export class Member {
  private _name = '';
  private _userId?: string;
  private _promptPayId?: string;

  constructor(readonly id: string, name: string, readonly color: number, userId?: string, promptPayId?: string) {
    this.rename(name);
    this._userId = userId;
    this.setPromptPay(promptPayId);
  }

  get name(): string { return this._name; }
  get userId(): string | undefined { return this._userId; }
  get promptPayId(): string | undefined { return this._promptPayId; }

  rename(name: string): void {
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 30) throw new DomainError('ชื่อสมาชิกต้องมี 1 ถึง 30 ตัวอักษร');
    this._name = clean;
  }

  setPromptPay(target?: string): void {
    const clean = target?.replace(/\D/g, '');
    if (clean && !isValidPromptPayTarget(clean)) {
      throw new DomainError('พร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก เลขบัตรประชาชน 13 หลัก หรือ e-Wallet 15 หลัก');
    }
    this._promptPayId = clean || undefined;
  }

  linkUser(userId: string): void {
    if (this._userId && this._userId !== userId) throw new DomainError('ชื่อนี้มีคนใช้แล้ว');
    this._userId = userId;
  }

  isLinked(): boolean { return this._userId !== undefined; }

  toJSON(): MemberData {
    return { id: this.id, name: this._name, color: this.color, userId: this._userId, promptPayId: this._promptPayId };
  }

  static fromJSON(data: MemberData): Member {
    return new Member(data.id, data.name, data.color, data.userId, data.promptPayId);
  }
}
