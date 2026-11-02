import { Component } from '../core/Component';
import { html, SafeHtml } from '../core/html';

/** กล่องโต้ตอบ ใช้แท็ก dialog จึงได้การกด Esc ปิดและการล็อกโฟกัสจากเบราว์เซอร์ */
export abstract class Modal extends Component {
  protected abstract readonly title: string;
  protected abstract body(): SafeHtml;

  protected constructor(className = '') {
    super('dialog', `modal ${className}`);
    this.on('click', '[data-close]', () => this.close());
    this.root.addEventListener('close', () => this.destroy());
    this.root.addEventListener('click', (event) => {
      if (event.target === this.root) this.close(); // คลิกพื้นหลังเพื่อปิด
    });
  }

  protected template(): SafeHtml {
    return html`
      <div class="modal-inner">
        <header class="modal-head">
          <h2>${this.title}</h2>
          <button type="button" class="icon-btn" data-close aria-label="ปิด">✕</button>
        </header>
        ${this.body()}
      </div>`;
  }

  open(): void {
    document.body.append(this.root);
    this.render();
    (this.root as HTMLDialogElement).showModal();
  }

  close(): void {
    (this.root as HTMLDialogElement).close();
  }
}
