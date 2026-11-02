import { html, SafeHtml } from '../core/html';
import { Modal } from './Modal';

/** ถามยืนยันก่อนลบข้อมูล */
export class ConfirmModal extends Modal {
  constructor(
    protected readonly title: string, private readonly message: string,
    private readonly actionLabel: string, private readonly onConfirm: () => Promise<void>,
  ) {
    super('modal-sm');
    this.on('click', '[data-confirm]', async (el) => {
      (el as HTMLButtonElement).disabled = true;
      await this.onConfirm();
      this.close();
    });
  }

  protected body(): SafeHtml {
    return html`
      <p>${this.message}</p>
      <div class="modal-actions">
        <button type="button" class="btn" data-close>ยกเลิก</button>
        <button type="button" class="btn btn-danger" data-confirm>${this.actionLabel}</button>
      </div>`;
  }
}
