import QRCode from 'qrcode';
import { html, SafeHtml } from '../core/html';
import { Modal } from './Modal';

/** ลิงก์เชิญเพื่อนเข้ากลุ่ม */
export class InviteModal extends Modal {
  protected readonly title = 'ชวนเพื่อนเข้ากลุ่ม';
  private readonly link: string;

  constructor(inviteCode: string, private readonly onCopied: () => void) {
    super('modal-sm');
    this.link = `${location.origin}/#/join/${inviteCode}`;
    this.on('click', '[data-copy]', async () => {
      await navigator.clipboard.writeText(this.link);
      this.onCopied();
    });
  }

  protected body(): SafeHtml {
    return html`
      <div class="qr-box">
        <img class="qr-image" alt="QR ลิงก์เชิญเข้ากลุ่ม">
        <p class="muted">เพื่อนสแกน QR หรือเปิดลิงก์ แล้วจะเห็นรายการเดียวกันกับคุณ</p>
        <input class="invite-link" readonly value="${this.link}" aria-label="ลิงก์เชิญ">
        <div class="modal-actions">
          <button type="button" class="btn btn-primary" data-copy>คัดลอกลิงก์</button>
        </div>
      </div>`;
  }

  protected override afterRender(): void {
    void QRCode.toDataURL(this.link, { width: 480, margin: 2 }).then((url) => {
      (this.root.querySelector('.qr-image') as HTMLImageElement).src = url;
    });
  }
}
