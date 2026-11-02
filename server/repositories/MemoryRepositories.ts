import { randomUUID } from 'node:crypto';
import { Group, GroupData } from '../../shared/domain/Group';
import { ConflictError } from '../errors';
import { GroupRepository, UserRecord, UserRepository } from './repositories';

/** เก็บข้อมูลในหน่วยความจำ ใช้ตอนรันเทสต์โดยไม่ต้องต่อฐานข้อมูลจริง */
export class MemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, UserRecord>();

  async create(data: Omit<UserRecord, 'id'>): Promise<UserRecord> {
    if (await this.findByEmail(data.email)) throw new ConflictError('อีเมลนี้สมัครไว้แล้ว');
    const user = { ...data, id: randomUUID() };
    this.users.set(user.id, user);
    return user;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return [...this.users.values()].find((u) => u.email === email) ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }
}

export class MemoryGroupRepository implements GroupRepository {
  private readonly groups = new Map<string, GroupData>();

  async create(data: Omit<GroupData, 'id' | 'version' | 'createdAt'>): Promise<Group> {
    const stored: GroupData = { ...data, id: randomUUID(), version: 0, createdAt: new Date().toISOString() };
    this.groups.set(stored.id, stored);
    return Group.fromJSON(stored);
  }

  async findById(id: string): Promise<Group | null> {
    const data = this.groups.get(id);
    return data ? Group.fromJSON(data) : null;
  }

  async findByInviteCode(code: string): Promise<Group | null> {
    const data = [...this.groups.values()].find((g) => g.inviteCode === code);
    return data ? Group.fromJSON(data) : null;
  }

  async findByUser(userId: string): Promise<Group[]> {
    return [...this.groups.values()]
      .filter((g) => g.members.some((m) => m.userId === userId))
      .map((g) => Group.fromJSON(g));
  }

  async save(group: Group): Promise<boolean> {
    const current = this.groups.get(group.id);
    if (!current || current.version !== group.version) return false;
    const data = JSON.parse(JSON.stringify(group.toJSON())) as GroupData;
    this.groups.set(group.id, { ...data, version: current.version + 1 });
    return true;
  }

  async delete(id: string): Promise<void> {
    this.groups.delete(id);
  }
}
