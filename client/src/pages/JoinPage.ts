import { AuthForm } from '../components/AuthForm';
import { InvitePreview } from '../core/ApiClient';
import { App } from '../core/App';
import { html, SafeHtml } from '../core/html';
import { Page } from './Page';

/** หน้าที่เปิดจากลิงก์เชิญ ให้เลือกว่าตัวเองคือใครในกลุ่ม */
export class JoinPage extends Page {
  private preview!: InvitePreview;
  private readonly form: AuthForm;

  constructor(app: App, private readonly code: string) {
    super(app, 'join');
    this.form = new AuthForm(app);
    this.on('click', '[data-join]', (el) => void this.join(el.dataset.join || undefined));
  }

  override async load(): Promise<void> {
    this.preview = await this.app.api.previewInvite(this.code);
  }

  private async join(memberId?: string): Promise<void> {
    try {
      const group = await this.app.api.joinGroup(this.code, memberId);
      this.app.router.go(`/groups/${group.id}`);
    } catch (error) {
      this.app.toast.error(error);
    }
  }

  protected template(): SafeHtml {
    const free = this.preview.members.filter((m) => !m.linked);
    return html`
      <section class="join-card">
        <p class="brand brand-dark">หารลงตัว</p>
        <h1>คุณได้รับเชิญเข้ากลุ่ม ${this.preview.name}</h1>
        ${this.app.user
          ? html`
            <p class="lede-dark">${free.length > 0 ? 'คุณคือคนไหนในกลุ่มนี้' : `เข้ากลุ่มในชื่อ ${this.app.user.name}`}</p>
            <div class="join-options">
              ${free.map((m) => html`<button class="btn" data-join="${m.id}">${m.name}</button>`)}
              <button class="btn btn-primary" data-join="">${free.length > 0 ? `ไม่มีชื่อฉัน เข้าในชื่อ ${this.app.user.name}` : 'เข้ากลุ่ม'}</button>
            </div>`
          : html`<p class="lede-dark">สมัครหรือเข้าสู่ระบบก่อนเข้ากลุ่ม</p><div class="form-slot"></div>`}
      </section>`;
  }

  protected override afterRender(): void {
    const slot = this.root.querySelector('.form-slot');
    if (slot) {
      slot.append(this.form.root);
      this.form.render();
    }
  }
}
