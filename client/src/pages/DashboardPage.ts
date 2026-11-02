import { Group } from '../../../shared/domain/Group';
import { avatar } from '../components/Avatar';
import { TopBar } from '../components/TopBar';
import { App } from '../core/App';
import { html, SafeHtml } from '../core/html';
import { SampleGroupBuilder } from '../core/SampleGroupBuilder';
import { Page } from './Page';

/** หน้ารวมทุกกลุ่มของผู้ใช้ */
export class DashboardPage extends Page {
  private groups: Group[] = [];

  constructor(app: App) {
    super(app, 'dashboard');
    this.on('submit', '[data-create]', (_el, event) => {
      event.preventDefault();
      const name = String(new FormData(event.target as HTMLFormElement).get('name'));
      void this.run(() => this.app.api.createGroup(name).then((g) => g.id));
    });
    this.on('click', '[data-sample]', () => {
      void this.run(() => new SampleGroupBuilder(this.app.api, this.app.user!.name).build());
    });
    this.on('click', '[data-logout]', () => void this.app.logout());
  }

  private async run(create: () => Promise<string>): Promise<void> {
    try {
      this.app.router.go(`/groups/${await create()}`);
    } catch (error) {
      this.app.toast.error(error);
    }
  }

  override async load(): Promise<void> {
    this.groups = (await this.app.api.listGroups()).map((data) => Group.fromJSON(data));
  }

  private row(group: Group): SafeHtml {
    const me = this.app.me(group)!;
    const balance = group.ledger().balanceOf(me.id);
    const status = balance.isZero()
      ? html`<span class="muted">ไม่มียอดค้าง</span>`
      : balance.isPositive()
        ? html`<span class="owed">จะได้คืน <span class="money">${balance.format()}</span></span>`
        : html`<span class="owe">ต้องโอน <span class="money">${balance.abs().format()}</span></span>`;
    return html`
      <li>
        <a class="group-row" href="#/groups/${group.id}">
          <span class="group-row-main">
            <strong>${group.name}</strong>
            <span class="avatars">${group.listMembers().slice(0, 6).map((m) => avatar(m, 'sm'))}</span>
          </span>
          <span class="group-row-side">
            <span>รวม <span class="money">${group.totalSpent().format()}</span></span>
            ${status}
          </span>
        </a>
      </li>`;
  }

  protected template(): SafeHtml {
    return html`
      ${new TopBar().markup(this.app.user!.name)}
      <div class="container">
        <h1 class="page-title">กลุ่มของคุณ</h1>
        <form class="create-form" data-create>
          <label class="grow">สร้างกลุ่มใหม่
            <input name="name" required maxlength="60" placeholder="เช่น ทริปเขาใหญ่ หรือ ห้อง 402">
          </label>
          <button class="btn btn-primary">สร้างกลุ่ม</button>
        </form>
        ${this.groups.length > 0
          ? html`<ul class="group-list">${this.groups.map((g) => this.row(g))}</ul>`
          : html`
            <div class="empty">
              <p>ยังไม่มีกลุ่ม สร้างกลุ่มแรกด้านบน หรือลองดูกลุ่มตัวอย่างที่มีข้อมูลทริป 4 คน</p>
              <button class="btn" data-sample>สร้างกลุ่มตัวอย่าง</button>
            </div>`}
      </div>`;
  }
}
