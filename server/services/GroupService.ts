import { randomBytes, randomUUID } from 'node:crypto';
import { DomainError } from '../../shared/domain/DomainError';
import { Group } from '../../shared/domain/Group';
import { Member } from '../../shared/domain/Member';
import { Money } from '../../shared/domain/Money';
import { createSplit } from '../../shared/domain/split/SplitFactory';
import { SplitData } from '../../shared/domain/split/SplitStrategy';
import { Expense } from '../../shared/domain/transaction/Expense';
import { Payment } from '../../shared/domain/transaction/Payment';
import { ConflictError, ForbiddenError, NotFoundError } from '../errors';
import { GroupRepository } from '../repositories/repositories';
import { PublicUser } from './AuthService';

export interface ExpenseInput {
  title: string;
  category: string;
  amountSatang: number;
  payerId: string;
  split: SplitData;
  date?: string;
}

/** กฎการใช้งานกลุ่ม: ตรวจสิทธิ์ แก้ข้อมูลผ่านคลาส Group แล้วบันทึกลงฐานข้อมูล */
export class GroupService {
  private static readonly MAX_RETRY = 3;
  private static readonly COLORS = 8;

  constructor(private readonly groups: GroupRepository) {}

  async create(user: PublicUser, name: string): Promise<Group> {
    const owner = new Member(randomUUID(), user.name, 0, user.id);
    const probe = new Group('new', name, user.id, 'new', 0, ''); // ตรวจชื่อกลุ่มก่อนบันทึก
    return this.groups.create({
      name: probe.name, ownerId: user.id, inviteCode: randomBytes(6).toString('base64url'),
      members: [owner.toJSON()], transactions: [],
    });
  }

  listFor(user: PublicUser): Promise<Group[]> {
    return this.groups.findByUser(user.id);
  }

  async get(user: PublicUser, groupId: string): Promise<Group> {
    const group = await this.groups.findById(groupId);
    if (!group || !group.findMemberByUser(user.id)) throw new NotFoundError('ไม่พบกลุ่มนี้ หรือคุณไม่ได้เป็นสมาชิก');
    return group;
  }

  async previewInvite(code: string): Promise<Group> {
    const group = await this.groups.findByInviteCode(code);
    if (!group) throw new NotFoundError('ลิงก์เชิญนี้ใช้ไม่ได้');
    return group;
  }

  /** เข้ากลุ่มด้วยลิงก์เชิญ โดยเลือกชื่อที่เพื่อนเพิ่มไว้แล้ว หรือสร้างชื่อใหม่ */
  async join(user: PublicUser, code: string, memberId?: string): Promise<Group> {
    const invited = await this.previewInvite(code);
    if (invited.findMemberByUser(user.id)) return invited;
    return this.mutate(user, invited.id, (group) => {
      if (memberId) {
        group.getMember(memberId).linkUser(user.id);
      } else {
        group.addMember(new Member(randomUUID(), user.name, group.listMembers().length % GroupService.COLORS, user.id));
      }
    }, false);
  }

  rename(user: PublicUser, groupId: string, name: string): Promise<Group> {
    return this.mutate(user, groupId, (group) => group.rename(name));
  }

  async delete(user: PublicUser, groupId: string): Promise<void> {
    const group = await this.get(user, groupId);
    if (group.ownerId !== user.id) throw new ForbiddenError('เฉพาะเจ้าของกลุ่มเท่านั้นที่ลบกลุ่มได้');
    await this.groups.delete(group.id);
  }

  addMember(user: PublicUser, groupId: string, name: string, promptPayId?: string): Promise<Group> {
    return this.mutate(user, groupId, (group) => {
      group.addMember(new Member(randomUUID(), name, group.listMembers().length % GroupService.COLORS, undefined, promptPayId));
    });
  }

  /** ชื่อและพร้อมเพย์ของคนที่มีบัญชีแล้ว เจ้าตัวเท่านั้นที่แก้ได้ กันการเปลี่ยนเลขบัญชีรับเงินของคนอื่น */
  updateMember(user: PublicUser, groupId: string, memberId: string, name: string, promptPayId?: string): Promise<Group> {
    return this.mutate(user, groupId, (group) => {
      const member = group.getMember(memberId);
      if (member.userId && member.userId !== user.id) throw new ForbiddenError('แก้ได้เฉพาะข้อมูลของตัวเอง');
      if (group.listMembers().some((m) => m.id !== memberId && m.name === name.trim())) {
        throw new DomainError(`มีชื่อ "${name.trim()}" ในกลุ่มแล้ว`);
      }
      member.rename(name);
      member.setPromptPay(promptPayId);
    });
  }

  removeMember(user: PublicUser, groupId: string, memberId: string): Promise<Group> {
    return this.mutate(user, groupId, (group) => group.removeMember(memberId));
  }

  saveExpense(user: PublicUser, groupId: string, input: ExpenseInput, existingId?: string): Promise<Group> {
    return this.mutate(user, groupId, (group) => {
      const previous = group.listTransactions().find((tx) => tx.id === existingId);
      if (existingId) group.removeTransaction(existingId); // ไม่พบรายการจะแจ้งข้อผิดพลาดตรงนี้
      group.saveTransaction(new Expense({
        id: existingId ?? randomUUID(), date: input.date ?? previous?.date ?? new Date().toISOString(),
        createdBy: previous?.createdBy ?? user.id,
        title: input.title, category: input.category, amount: Money.fromSatang(input.amountSatang),
        payerId: input.payerId, split: createSplit(input.split),
      }));
    });
  }

  recordPayment(user: PublicUser, groupId: string, fromId: string, toId: string, amountSatang: number): Promise<Group> {
    return this.mutate(user, groupId, (group) => {
      group.saveTransaction(new Payment(randomUUID(), new Date().toISOString(), user.id, fromId, toId, Money.fromSatang(amountSatang)));
    });
  }

  removeTransaction(user: PublicUser, groupId: string, transactionId: string): Promise<Group> {
    return this.mutate(user, groupId, (group) => group.removeTransaction(transactionId));
  }

  /** อ่าน แก้ แล้วบันทึก ถ้ามีคนแก้พร้อมกันจะอ่านใหม่แล้วลองอีกครั้ง */
  private async mutate(user: PublicUser, groupId: string, change: (group: Group) => void, requireMember = true): Promise<Group> {
    for (let attempt = 0; attempt < GroupService.MAX_RETRY; attempt++) {
      const group = requireMember ? await this.get(user, groupId) : await this.groups.findById(groupId);
      if (!group) throw new NotFoundError('ไม่พบกลุ่มนี้');
      change(group);
      if (await this.groups.save(group)) return (await this.groups.findById(groupId))!;
    }
    throw new ConflictError('มีคนแก้ข้อมูลพร้อมกัน ลองใหม่อีกครั้ง');
  }
}
