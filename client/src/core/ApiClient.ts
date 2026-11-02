import { GroupData } from '../../../shared/domain/Group';
import { SplitData } from '../../../shared/domain/split/SplitStrategy';

export interface User { id: string; email: string; name: string }
export interface InvitePreview { name: string; members: { id: string; name: string; linked: boolean }[] }
export interface ExpensePayload { title: string; category: string; amountSatang: number; payerId: string; split: SplitData }

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/** รวมการเรียก Backend ไว้ที่เดียว หน้าเว็บจึงไม่ต้องรู้รายละเอียดของ fetch และ URL */
export class ApiClient {
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`/api${path}`, {
        method,
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่');
    }
    if (response.status === 204) return undefined as T;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError(response.status, data.error ?? 'ระบบขัดข้อง ลองใหม่อีกครั้ง');
    return data as T;
  }

  private async group(method: string, path: string, body?: unknown): Promise<GroupData> {
    return (await this.request<{ group: GroupData }>(method, path, body)).group;
  }

  async me(): Promise<User | null> {
    try {
      return (await this.request<{ user: User }>('GET', '/auth/me')).user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  }
  async login(email: string, password: string): Promise<User> {
    return (await this.request<{ user: User }>('POST', '/auth/login', { email, password })).user;
  }
  async register(email: string, password: string, name: string): Promise<User> {
    return (await this.request<{ user: User }>('POST', '/auth/register', { email, password, name })).user;
  }
  logout(): Promise<void> { return this.request('POST', '/auth/logout'); }

  async listGroups(): Promise<GroupData[]> {
    return (await this.request<{ groups: GroupData[] }>('GET', '/groups')).groups;
  }
  createGroup(name: string) { return this.group('POST', '/groups', { name }); }
  getGroup(id: string) { return this.group('GET', `/groups/${id}`); }
  renameGroup(id: string, name: string) { return this.group('PATCH', `/groups/${id}`, { name }); }
  deleteGroup(id: string): Promise<void> { return this.request('DELETE', `/groups/${id}`); }

  addMember(id: string, name: string, promptPayId?: string) { return this.group('POST', `/groups/${id}/members`, { name, promptPayId }); }
  updateMember(id: string, memberId: string, name: string, promptPayId?: string) { return this.group('PUT', `/groups/${id}/members/${memberId}`, { name, promptPayId }); }
  removeMember(id: string, memberId: string) { return this.group('DELETE', `/groups/${id}/members/${memberId}`); }

  addExpense(id: string, expense: ExpensePayload) { return this.group('POST', `/groups/${id}/expenses`, expense); }
  updateExpense(id: string, txId: string, expense: ExpensePayload) { return this.group('PUT', `/groups/${id}/expenses/${txId}`, expense); }
  addPayment(id: string, fromId: string, toId: string, amountSatang: number) { return this.group('POST', `/groups/${id}/payments`, { fromId, toId, amountSatang }); }
  removeTransaction(id: string, txId: string) { return this.group('DELETE', `/groups/${id}/transactions/${txId}`); }

  previewInvite(code: string): Promise<InvitePreview> { return this.request('GET', `/invites/${code}`); }
  joinGroup(code: string, memberId?: string) { return this.group('POST', `/invites/${code}/join`, { memberId }); }
}
