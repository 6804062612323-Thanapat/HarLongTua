import { Component } from '../core/Component';
import { html, SafeHtml } from '../core/html';

/** ข้อความแจ้งผลสั้น ๆ ที่มุมจอ */
export class Toast extends Component {
  private message = '';
  private isError = false;
  private timer?: number;

  constructor() {
    super('div', 'toast');
    this.root.setAttribute('role', 'status');
    this.root.hidden = true;
  }

  protected template(): SafeHtml {
    return html`${this.message}`;
  }

  show(message: string, isError = false): void {
    this.message = message;
    this.isError = isError;
    this.root.classList.toggle('toast-error', this.isError);
    this.root.hidden = false;
    this.render();
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => { this.root.hidden = true; }, isError ? 5000 : 2600);
  }

  error(error: unknown): void {
    this.show(error instanceof Error ? error.message : 'เกิดข้อผิดพลาด', true);
  }
}
