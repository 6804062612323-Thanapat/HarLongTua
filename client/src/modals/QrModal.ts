import QRCode from 'qrcode';
import { Member } from '../../../shared/domain/Member';
import { Money } from '../../../shared/domain/Money';
import { PromptPayPayload } from '../../../shared/domain/PromptPayPayload';
import { html, SafeHtml } from '../core/html';
import { Modal } from './Modal';

/** QR พร้อมเพย์ของการโอนหนึ่งครั้ง */
export class QrModal extends Modal {
  protected readonly title = 'สแกนเพื่อโอน';

  constructor(
    private readonly from: Member, private readonly to: Member, private readonly amount: Money,
    private readonly onPaid: () => Promise<void>,
  ) {
    super('modal-sm');
    this.on('click', '[data-paid]', async () => {
      await this.onPaid();
      this.close();
    });
  }

  protected body(): SafeHtml {
    return html`
      <div class="qr-box">
        <p>${this.from.name} โอนให้ ${this.to.name}</p>
        <p class="qr-amount"><span class="money">${this.amount.format()}</span> บาท</p>
        <img class="qr-image" alt="QR พร้อมเพย์ของ ${this.to.name} ยอด ${this.amount.format()} บาท">
        <p class="muted">ตรวจชื่อผู้รับในแอปธนาคารก่อนกดยืนยัน</p>
        <div class="modal-actions">
          <a class="btn" data-download download="promptpay-${this.to.name}.png">บันทึกรูป QR</a>
          <button type="button" class="btn btn-primary" data-paid>โอนแล้ว</button>
        </div>
      </div>`;
  }

  protected override afterRender(): void {
    const payload = new PromptPayPayload(this.to.promptPayId!, this.amount).toString();
    void QRCode.toDataURL(payload, { width: 560, margin: 2, errorCorrectionLevel: 'M' }).then((url) => {
      (this.root.querySelector('.qr-image') as HTMLImageElement).src = url;
      (this.root.querySelector('[data-download]') as HTMLAnchorElement).href = url;
    });
  }
}
