import { Group } from '../../../shared/domain/Group';
import { Toast } from '../components/Toast';
import { DashboardPage } from '../pages/DashboardPage';
import { GroupPage } from '../pages/GroupPage';
import { JoinPage } from '../pages/JoinPage';
import { LandingPage } from '../pages/LandingPage';
import { Page } from '../pages/Page';
import { ApiClient, User } from './ApiClient';
import { Router } from './Router';

/** ตัวกลางของฝั่งหน้าเว็บ: ถือผู้ใช้ปัจจุบัน และสลับหน้า */
export class App {
  readonly api = new ApiClient();
  readonly router = new Router();
  readonly toast = new Toast();
  private _user: User | null = null;
  private page?: Page;
  private navigation = 0;

  constructor(private readonly host: HTMLElement) {}

  get user(): User | null { return this._user; }

  async start(): Promise<void> {
    document.body.append(this.toast.root);
    this.host.innerHTML = '<p class="page-loading">กำลังเปิด</p>';
    this._user = await this.api.me().catch(() => null);
    this.router
      .add(/^\/$/, () => this.show(this._user ? new DashboardPage(this) : new LandingPage(this)))
      .add(/^\/groups\/([\w-]+)$/, ([id]) => this.show(this._user ? new GroupPage(this, id) : new LandingPage(this)))
      .add(/^\/join\/([\w-]+)$/, ([code]) => this.show(new JoinPage(this, code)))
      .start();
  }

  setUser(user: User | null): void {
    this._user = user;
    this.router.resolve();
  }

  async logout(): Promise<void> {
    await this.api.logout();
    this._user = null;
    this.router.go('/');
  }

  /** หา Member ของผู้ใช้ที่ล็อกอินอยู่ในกลุ่ม */
  me(group: Group) {
    return this._user ? group.findMemberByUser(this._user.id) : undefined;
  }

  private async show(next: Page): Promise<void> {
    const navigation = ++this.navigation;
    try {
      await next.load();
    } catch (error) {
      if (navigation === this.navigation) this.showError(error);
      return;
    }
    if (navigation !== this.navigation) return; // ผู้ใช้เปลี่ยนหน้าไปแล้ว
    this.page?.destroy();
    this.page = next;
    this.host.replaceChildren(next.root);
    next.render();
    window.scrollTo(0, 0);
  }

  private showError(error: unknown): void {
    const message = error instanceof Error ? error.message : 'เปิดหน้านี้ไม่ได้';
    this.page?.destroy();
    this.page = undefined;
    const box = document.createElement('div');
    box.className = 'page-error';
    const text = document.createElement('p');
    text.textContent = message;
    const link = document.createElement('a');
    link.href = '#/';
    link.className = 'btn';
    link.textContent = 'กลับหน้าแรก';
    box.append(text, link);
    this.host.replaceChildren(box);
  }
}
