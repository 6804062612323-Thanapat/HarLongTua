import { CATEGORIES } from '../../../../shared/domain/categories';
import { Group } from '../../../../shared/domain/Group';
import { Expense } from '../../../../shared/domain/transaction/Expense';
import { Payment } from '../../../../shared/domain/transaction/Payment';
import { Transaction } from '../../../../shared/domain/transaction/Transaction';
import { html, SafeHtml } from '../../core/html';
import { Tab } from './Tab';

const dateFormat = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' });

export class TransactionsTab extends Tab {
  readonly label = 'รายการ';

  markup(group: Group): SafeHtml {
    const list = group.listTransactions();
    if (list.length === 0) {
      return html`
        <div class="empty">
          <p>ยังไม่มีรายการ เพิ่มค่าใช้จ่ายรายการแรก เช่น ค่าอาหารมื้อนี้</p>
          <button class="btn btn-primary" data-add-expense>เพิ่มรายการ</button>
        </div>`;
    }
    return html`<ul class="tx-list">${list.map((tx) => this.row(group, tx))}</ul>`;
  }

  private row(group: Group, tx: Transaction): SafeHtml {
    const date = dateFormat.format(new Date(tx.date));
    if (tx instanceof Expense) {
      const category = CATEGORIES[tx.category] ?? CATEGORIES.other;
      return html`
        <li class="tx">
          <span class="tx-icon" title="${category.label}">${category.icon}</span>
          <div class="tx-body">
            <strong>${tx.title}</strong>
            <span class="muted">${group.getMember(tx.payerId).name} จ่าย, ${tx.split.label} ${tx.split.participantIds().length} คน, ${date}</span>
          </div>
          <span class="money tx-amount">${tx.amount.format()}</span>
          <div class="tx-actions">
            <button class="btn-link" data-edit-tx="${tx.id}">แก้ไข</button>
            <button class="btn-link btn-link-danger" data-delete-tx="${tx.id}">ลบ</button>
          </div>
        </li>`;
    }
    const payment = tx as Payment;
    return html`
      <li class="tx tx-payment">
        <span class="tx-icon">💸</span>
        <div class="tx-body">
          <strong>${group.getMember(payment.fromId).name} โอนให้ ${group.getMember(payment.toId).name}</strong>
          <span class="muted">โอนคืน, ${date}</span>
        </div>
        <span class="money tx-amount">${payment.amount.format()}</span>
        <div class="tx-actions">
          <button class="btn-link btn-link-danger" data-delete-tx="${tx.id}">ลบ</button>
        </div>
      </li>`;
  }
}
