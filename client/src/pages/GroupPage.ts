import { Group } from '../../../shared/domain/Group';
import { Member } from '../../../shared/domain/Member';
import { Money } from '../../../shared/domain/Money';
import { Transfer } from '../../../shared/domain/settlement/SettlementStrategy';
import { Expense } from '../../../shared/domain/transaction/Expense';
import { CsvExporter } from '../../../shared/export/CsvExporter';
import { TextSummaryExporter } from '../../../shared/export/TextSummaryExporter';
import { TopBar } from '../components/TopBar';
import { InsightsTab } from '../components/tabs/InsightsTab';
import { MembersTab } from '../components/tabs/MembersTab';
import { Tab } from '../components/tabs/Tab';
import { TransactionsTab } from '../components/tabs/TransactionsTab';
import { App } from '../core/App';
import { html, SafeHtml } from '../core/html';
import { ConfirmModal } from '../modals/ConfirmModal';
import { ExpenseModal } from '../modals/ExpenseModal';
import { InviteModal } from '../modals/InviteModal';
import { MemberModal } from '../modals/MemberModal';
import { QrModal } from '../modals/QrModal';
import { Page } from './Page';

/** หน้าหลักของกลุ่ม: ซ้ายคือใบสรุปการโอน ขวาคือแท็บข้อมูล */
export class GroupPage extends Page {
  private static readonly POLL_MS = 8000;
  private group!: Group;
  private activeTab = 0;
  private tabs: Tab[] = [];
  private poller?: number;
  private wasSettled = false;

  constructor(app: App, private readonly groupId: string) {
    super(app, 'group-page');
    this.bindEvents();
  }

  override async load(): Promise<void> {
    this.group = Group.fromJSON(await this.app.api.getGroup(this.groupId));
    this.wasSettled = this.group.isSettled();
    this.tabs = [new TransactionsTab(), new MembersTab(), new InsightsTab()];
    // ถ้าเพื่อนแก้ข้อมูล หน้านี้จะอัปเดตเองภายในไม่กี่วินาที
    this.poller = window.setInterval(() => void this.refresh(), GroupPage.POLL_MS);
  }

  override destroy(): void {
    window.clearInterval(this.poller);
    super.destroy();
  }

  private async refresh(): Promise<void> {
    if (document.hidden || document.querySelector('dialog[open]')) return;
    try {
      const data = await this.app.api.getGroup(this.groupId);
      if (data.version !== this.group.version) this.update(data);
    } catch {
      // เครือข่ายสะดุดชั่วคราว รอบถัดไปจะลองใหม่เอง
    }
  }

  private update(data: ReturnType<Group['toJSON']>): void {
    const scrollY = window.scrollY;
    this.group = Group.fromJSON(data);
    this.render();
    window.scrollTo(0, scrollY);
  }

  /** เรียก API ที่คืนกลุ่มล่าสุด แล้ววาดหน้าใหม่ */
  private async apply(request: Promise<ReturnType<Group['toJSON']>>, success?: string): Promise<void> {
    this.update(await request);
    if (success) this.app.toast.show(success);
  }

  /** เหมือน apply แต่แจ้งข้อผิดพลาดเองเมื่อไม่มีฟอร์มรับไว้ */
  private guarded(request: () => Promise<void>): void {
    request().catch((error) => this.app.toast.error(error));
  }

  private bindEvents(): void {
    const api = this.app.api;
    const id = this.groupId;
    this.on('click', '[data-logout]', () => void this.app.logout());
    this.on('click', '[data-tab]', (el) => {
      this.activeTab = Number(el.dataset.tab);
      this.render();
    });
    this.on('click', '[data-add-expense]', () => this.openExpense(null));
    this.on('click', '[data-edit-tx]', (el) => {
      const tx = this.group.listTransactions().find((t) => t.id === el.dataset.editTx);
      if (tx instanceof Expense) this.openExpense(tx);
    });
    this.on('click', '[data-delete-tx]', (el) => {
      new ConfirmModal('ลบรายการนี้', 'ยอดของทุกคนจะถูกคำนวณใหม่', 'ลบรายการ', () =>
        this.apply(api.removeTransaction(id, el.dataset.deleteTx!), 'ลบรายการแล้ว').catch((e) => this.app.toast.error(e))).open();
    });
    this.on('click', '[data-invite]', () => {
      new InviteModal(this.group.inviteCode, () => this.app.toast.show('คัดลอกลิงก์แล้ว')).open();
    });
    this.on('click', '[data-add-member]', () => {
      new MemberModal(null, (name, pp) => this.apply(api.addMember(id, name, pp), `เพิ่ม ${name} แล้ว`)).open();
    });
    this.on('click', '[data-edit-member]', (el) => {
      const member = this.group.getMember(el.dataset.editMember!);
      new MemberModal(member, (name, pp) => this.apply(api.updateMember(id, member.id, name, pp), 'บันทึกแล้ว')).open();
    });
    this.on('click', '[data-remove-member]', (el) => {
      const member = this.group.getMember(el.dataset.removeMember!);
      new ConfirmModal(`ลบ ${member.name}`, 'ลบออกจากกลุ่มนี้', 'ลบสมาชิก', () =>
        this.apply(api.removeMember(id, member.id), 'ลบแล้ว').catch((e) => this.app.toast.error(e))).open();
    });
    this.on('click', '[data-qr]', (el) => this.openQr(this.transferAt(el)));
    this.on('click', '[data-paid]', (el) => this.confirmPaid(this.transferAt(el)));
    this.on('click', '[data-copy-summary]', () => this.guarded(async () => {
      await navigator.clipboard.writeText(new TextSummaryExporter().export(this.group));
      this.app.toast.show('คัดลอกสรุปแล้ว วางในแชทได้เลย');
    }));
    this.on('click', '[data-export-csv]', () => this.download(new CsvExporter()));
    this.on('click', '[data-delete-group]', () => {
      new ConfirmModal('ลบกลุ่มนี้', `รายการทั้งหมดใน ${this.group.name} จะหายไปและกู้คืนไม่ได้`, 'ลบกลุ่ม', async () => {
        try {
          await api.deleteGroup(id);
          this.app.router.go('/');
        } catch (error) {
          this.app.toast.error(error);
        }
      }).open();
    });
  }

  private transferAt(el: HTMLElement): Transfer {
    return this.group.settle()[Number(el.dataset.index)];
  }

  private openExpense(existing: Expense | null): void {
    const myId = this.app.me(this.group)?.id ?? this.group.listMembers()[0].id;
    new ExpenseModal(this.group, myId, existing, (expense) => this.apply(
      existing ? this.app.api.updateExpense(this.groupId, existing.id, expense) : this.app.api.addExpense(this.groupId, expense),
      existing ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มรายการแล้ว',
    )).open();
  }

  private recordPaid(transfer: Transfer): Promise<void> {
    return this.apply(
      this.app.api.addPayment(this.groupId, transfer.fromId, transfer.toId, transfer.amount.toSatang()),
      'บันทึกการโอนแล้ว',
    ).catch((error) => this.app.toast.error(error));
  }

  private openQr(transfer: Transfer): void {
    const to = this.group.getMember(transfer.toId);
    const from = this.group.getMember(transfer.fromId);
    if (!to.promptPayId) {
      const canEdit = !to.userId || to.userId === this.app.user!.id;
      this.app.toast.show(canEdit ? `ใส่เลขพร้อมเพย์ของ ${to.name} ก่อน` : `ให้ ${to.name} ใส่เลขพร้อมเพย์ในแท็บสมาชิกก่อน`, true);
      if (canEdit) new MemberModal(to, (name, pp) => this.apply(this.app.api.updateMember(this.groupId, to.id, name, pp), 'บันทึกแล้ว')).open();
      return;
    }
    new QrModal(from, to, transfer.amount, () => this.recordPaid(transfer)).open();
  }

  private confirmPaid(transfer: Transfer): void {
    const from = this.group.getMember(transfer.fromId);
    const to = this.group.getMember(transfer.toId);
    new ConfirmModal('บันทึกว่าโอนแล้ว', `${from.name} โอนให้ ${to.name} ${transfer.amount.format()} บาท`, 'โอนแล้ว', () => this.recordPaid(transfer)).open();
  }

  private download(exporter: CsvExporter): void {
    const url = URL.createObjectURL(new Blob([exporter.export(this.group)], { type: exporter.mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.group.name}-${exporter.fileName}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private transferRow(transfer: Transfer, index: number, member: (id: string) => Member, myId?: string): SafeHtml {
    const from = member(transfer.fromId);
    const to = member(transfer.toId);
    const mine = transfer.fromId === myId || transfer.toId === myId;
    return html`
      <li class="transfer ${mine ? 'transfer-mine' : ''}">
        <div class="transfer-who">
          <span>${from.name} <span class="transfer-arrow" aria-label="โอนให้">→</span> ${to.name}</span>
          <span class="money">${transfer.amount.format()}</span>
        </div>
        <div class="transfer-actions">
          <button class="btn-link" data-qr data-index="${index}">สแกน QR</button>
          <button class="btn-link" data-paid data-index="${index}">โอนแล้ว</button>
        </div>
      </li>`;
  }

  private receipt(): SafeHtml {
    const group = this.group;
    const transfers = group.settle();
    const direct = group.directTransferCount();
    const member = (id: string) => group.getMember(id);
    const myId = this.app.me(group)?.id;
    const myBalance = myId ? group.ledger().balanceOf(myId) : Money.ZERO;
    const settled = group.isSettled();
    return html`
      <aside class="receipt receipt-sticky">
        <p class="receipt-label">รวมค่าใช้จ่าย</p>
        <p class="receipt-big money">${group.totalSpent().format()}</p>
        <p class="receipt-me">${myBalance.isZero()
          ? 'คุณไม่มียอดค้าง'
          : myBalance.isPositive()
            ? html`คุณจะได้คืน <span class="money">${myBalance.format()}</span> บาท`
            : html`คุณต้องโอน <span class="money">${myBalance.abs().format()}</span> บาท`}</p>
        <h2 class="receipt-heading">ใครโอนให้ใคร</h2>
        ${transfers.length > 0
          ? html`
            <ul class="transfers">${transfers.map((t, i) => this.transferRow(t, i, member, myId))}</ul>
            ${direct > transfers.length && html`<p class="muted saved">ลดการโอนจาก ${direct} ครั้ง เหลือ ${transfers.length} ครั้ง</p>`}`
          : html`<p class="muted">${settled ? 'ทุกคนโอนครบแล้ว' : 'เพิ่มรายการแรก แล้วยอดโอนจะแสดงที่นี่'}</p>`}
        ${settled && html`<div class="stamp ${this.wasSettled ? '' : 'stamp-animate'}" aria-hidden="true">หารลงตัว</div>`}
        <div class="receipt-tools">
          <button class="btn-link" data-copy-summary>คัดลอกสรุปไปวางในแชท</button>
          <button class="btn-link" data-export-csv>ดาวน์โหลด CSV</button>
        </div>
      </aside>`;
  }

  protected template(): SafeHtml {
    const group = this.group;
    const tab = this.tabs[this.activeTab];
    return html`
      ${new TopBar().markup(this.app.user!.name)}
      <header class="group-head">
        <div class="container group-head-inner">
          <div>
            <a class="back" href="#/">ทุกกลุ่ม</a>
            <h1>${group.name}</h1>
          </div>
          <div class="group-head-actions">
            <button class="btn btn-on-dark" data-invite>ชวนเพื่อน</button>
            <button class="btn btn-accent" data-add-expense>เพิ่มรายการ</button>
          </div>
        </div>
      </header>
      <div class="container group-layout">
        ${this.receipt()}
        <section class="group-main">
          <div class="tabs" role="tablist">
            ${this.tabs.map((t, i) => html`<button role="tab" aria-selected="${i === this.activeTab}" data-tab="${i}">${t.label}</button>`)}
          </div>
          ${tab.markup(group, this.app.user!.id)}
          ${group.ownerId === this.app.user!.id && this.activeTab === 1 && html`<button class="btn-link btn-link-danger" data-delete-group>ลบกลุ่มนี้</button>`}
        </section>
      </div>`;
  }

  protected override afterRender(): void {
    this.wasSettled = this.group.isSettled();
  }
}
