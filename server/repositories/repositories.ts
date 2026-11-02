import { Group, GroupData } from '../../shared/domain/Group';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}

/** ส่วนบริการรู้จักฐานข้อมูลผ่าน Interface เท่านั้น จึงสลับเป็น MongoDB หรือหน่วยความจำได้ */
export interface UserRepository {
  create(data: Omit<UserRecord, 'id'>): Promise<UserRecord>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
}

export interface GroupRepository {
  create(data: Omit<GroupData, 'id' | 'version' | 'createdAt'>): Promise<Group>;
  findById(id: string): Promise<Group | null>;
  findByInviteCode(code: string): Promise<Group | null>;
  findByUser(userId: string): Promise<Group[]>;
  /** คืน false ถ้าข้อมูลถูกคนอื่นแก้ไปก่อน (version ไม่ตรง) */
  save(group: Group): Promise<boolean>;
  delete(id: string): Promise<void>;
}
