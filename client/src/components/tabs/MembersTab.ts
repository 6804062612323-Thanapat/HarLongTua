import { Group } from '../../../../shared/domain/Group';
import { html, SafeHtml } from '../../core/html';
import { avatar } from '../Avatar';
import { Tab } from './Tab';

export class MembersTab extends Tab {
  readonly label = 'สมาชิก';

  markup(group: Group, userId: string): SafeHtml {
    const ledger = group.ledger();
    return html`
      <ul class="member-list">
        ${group.listMembers().map((m) => {
          const balance = ledger.balanceOf(m.id);
          const editable = !m.userId || m.userId === userId;
          return html`
            <li class="member">
              ${avatar(m)}
              <div class="member-body">
                <strong>${m.name}${m.userId === userId ? ' (คุณ)' : ''}</strong>
                <span class="muted">${m.promptPayId ? 'มีพร้อมเพย์แล้ว' : 'ยังไม่มีพร้อมเพย์'}${m.isLinked() ? '' : ', ยังไม่ได้เข้าเว็บ'}</span>
              </div>
              <span class="money ${balance.isNegative() ? 'owe' : balance.isPositive() ? 'owed' : ''}">${balance.isPositive() ? '+' : ''}${balance.format()}</span>
              <div class="tx-actions">
                ${editable && html`<button class="btn-link" data-edit-member="${m.id}">แก้ไข</button>`}
                ${m.userId !== group.ownerId && html`<button class="btn-link btn-link-danger" data-remove-member="${m.id}">ลบ</button>`}
              </div>
            </li>`;
        })}
      </ul>
      <button class="btn" data-add-member>เพิ่มเพื่อน</button>`;
  }
}
