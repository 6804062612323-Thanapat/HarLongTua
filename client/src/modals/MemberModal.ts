import { Member } from '../../../shared/domain/Member';
import { html, SafeHtml } from '../core/html';
import { Modal } from './Modal';

/** เพิ่มหรือแก้ไขสมาชิก */
export class MemberModal extends Modal {
  protected readonly title: string;
  private errorText = '';

  constructor(
    private readonly member: Member | null,
    private readonly onSave: (name: string, promptPayId?: string) => Promise<void>,
  ) {
    super('modal-sm');
    this.title = member ? `แก้ไข ${member.name}` : 'เพิ่มเพื่อน';
    this.on('submit', 'form', async (_el, event) => {
      event.preventDefault();
      const data = new FormData(event.target as HTMLFormElement);
      try {
        await this.onSave(String(data.get('name')), String(data.get('promptPay')) || undefined);
        this.close();
      } catch (error) {
        this.errorText = error instanceof Error ? error.message : 'บันทึกไม่ได้';
        const box = this.root.querySelector('.form-error') as HTMLElement;
        box.textContent = this.errorText;
        box.hidden = false;
      }
    });
  }

  protected body(): SafeHtml {
    return html`
      <form>
        <label>ชื่อ<input name="name" required maxlength="30" value="${this.member?.name ?? ''}" autofocus></label>
        <label>พร้อมเพย์ <small>ไม่บังคับ ใช้สร้าง QR ให้เพื่อนโอนเข้า</small>
          <input name="promptPay" inputmode="numeric" maxlength="20" placeholder="เบอร์มือถือ หรือเลขบัตรประชาชน" value="${this.member?.promptPayId ?? ''}">
        </label>
        <p class="form-error" role="alert" hidden></p>
        <div class="modal-actions">
          <button type="button" class="btn" data-close>ยกเลิก</button>
          <button class="btn btn-primary">${this.member ? 'บันทึก' : 'เพิ่มเพื่อน'}</button>
        </div>
      </form>`;
  }
}
