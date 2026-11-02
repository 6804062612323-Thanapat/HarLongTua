import { isValidObjectId } from 'mongoose';
import { Group, GroupData } from '../../shared/domain/Group';
import { GroupModel, UserModel } from '../models/schemas';
import { ConflictError } from '../errors';
import { GroupRepository, UserRecord, UserRepository } from './repositories';

export class MongoUserRepository implements UserRepository {
  async create(data: Omit<UserRecord, 'id'>): Promise<UserRecord> {
    try {
      const doc = await UserModel.create(data);
      return this.toRecord(doc);
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new ConflictError('อีเมลนี้สมัครไว้แล้ว');
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const doc = await UserModel.findOne({ email: String(email) });
    return doc && this.toRecord(doc);
  }

  async findById(id: string): Promise<UserRecord | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await UserModel.findById(id);
    return doc && this.toRecord(doc);
  }

  private toRecord(doc: any): UserRecord {
    return { id: String(doc._id), email: doc.email, name: doc.name, passwordHash: doc.passwordHash };
  }
}

export class MongoGroupRepository implements GroupRepository {
  async create(data: Omit<GroupData, 'id' | 'version' | 'createdAt'>): Promise<Group> {
    const doc = await GroupModel.create({ ...data, version: 0 });
    return this.toGroup(doc);
  }

  async findById(id: string): Promise<Group | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await GroupModel.findById(id).lean();
    return doc && this.toGroup(doc);
  }

  async findByInviteCode(code: string): Promise<Group | null> {
    const doc = await GroupModel.findOne({ inviteCode: String(code) }).lean();
    return doc && this.toGroup(doc);
  }

  async findByUser(userId: string): Promise<Group[]> {
    const docs = await GroupModel.find({ 'members.userId': String(userId) }).sort({ updatedAt: -1 }).lean();
    return docs.map((doc) => this.toGroup(doc));
  }

  /** Optimistic Locking: บันทึกได้ก็ต่อเมื่อ version ยังตรงกับตอนที่อ่านมา */
  async save(group: Group): Promise<boolean> {
    const { name, members, transactions } = group.toJSON();
    const result = await GroupModel.updateOne(
      { _id: group.id, version: group.version },
      { $set: { name, members, transactions }, $inc: { version: 1 } },
    );
    return result.matchedCount === 1;
  }

  async delete(id: string): Promise<void> {
    await GroupModel.deleteOne({ _id: id });
  }

  private toGroup(doc: any): Group {
    return Group.fromJSON({
      id: String(doc._id), name: doc.name, ownerId: doc.ownerId, inviteCode: doc.inviteCode,
      version: doc.version, createdAt: new Date(doc.createdAt).toISOString(),
      members: doc.members, transactions: doc.transactions,
    });
  }
}
