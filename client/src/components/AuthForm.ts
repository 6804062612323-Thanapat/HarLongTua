import { Component } from '../core/Component';
import { App } from '../core/App';
import { html, SafeHtml } from '../core/html';

/** ฟอร์มเดียวสลับได้ระหว่างเข้าสู่ระบบกับสมัครสมาชิก */
export class AuthForm extends Component {
  private mode: 'login' | 'register' = 'register';
  private errorText = '';
  private busy = false;

  constructor(private readonly app: App) {
    super('div', 'auth');
    this.on('click', '[data-mode]', (el) => {
      this.mode = el.dataset.mode as 'login' | 'register';
      this.errorText = '';
      this.render();
    });
    this.on('submit', 'form', (_el, event) => {
      event.preventDefault();
      void this.submit(event.target as HTMLFormElement);
    });
  }

  private async submit(form: HTMLFormElement): Promise<void> {
    if (this.busy) return;
    const data = new FormData(form);
    const email = String(data.get('email'));
    const password = String(data.get('password'));
    this.busy = true;
    this.errorText = '';
    try {
      const user = this.mode === 'login'
        ? await this.app.api.login(email, password)
        : await this.app.api.register(email, password, String(data.get('name')));
      this.app.setUser(user);
    } catch (error) {
      this.errorText = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
      this.busy = false;
      this.render();
      (this.root.querySelector('[name=email]') as HTMLInputElement).value = email;
    }
  }

  protected template(): SafeHtml {
    const isLogin = this.mode === 'login';
    return html`
      <div class="segmented" role="tablist">
        <button type="button" role="tab" aria-selected="${!isLogin}" data-mode="register">สมัครสมาชิก</button>
        <button type="button" role="tab" aria-selected="${isLogin}" data-mode="login">เข้าสู่ระบบ</button>
      </div>
      <form>
        ${!isLogin && html`<label>ชื่อที่เพื่อนเรียก<input name="name" required maxlength="30" autocomplete="nickname"></label>`}
        <label>อีเมล<input name="email" type="email" required autocomplete="email"></label>
        <label>รหัสผ่าน${!isLogin && html` <small>อย่างน้อย 8 ตัวอักษร</small>`}
          <input name="password" type="password" required minlength="${isLogin ? 1 : 8}" maxlength="72" autocomplete="${isLogin ? 'current-password' : 'new-password'}">
        </label>
        ${this.errorText && html`<p class="form-error" role="alert">${this.errorText}</p>`}
        <button class="btn btn-primary btn-block">${isLogin ? 'เข้าสู่ระบบ' : 'สมัครและเริ่มใช้งาน'}</button>
      </form>`;
  }
}
