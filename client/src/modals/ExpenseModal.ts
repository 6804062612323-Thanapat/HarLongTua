import { CATEGORIES } from '../../../shared/domain/categories';
import { DomainError } from '../../../shared/domain/DomainError';
import { Group } from '../../../shared/domain/Group';
import { Money } from '../../../shared/domain/Money';
import { createSplit } from '../../../shared/domain/split/SplitFactory';
import { SplitData } from '../../../shared/domain/split/SplitStrategy';
import { Expense } from '../../../shared/domain/transaction/Expense';
import { ExpensePayload } from '../core/ApiClient';
import { html, SafeHtml } from '../core/html';
import { avatar } from '../components/Avatar';
import { Modal } from './Modal';

type Kind = SplitData['kind'];

interface ItemRow { name: string; price: string; participantIds: string[] }

const KINDS: { kind: Kind; label: string }[] = [
  { kind: 'equal', label: 'เท่ากัน' },
  { kind: 'itemized', label: 'ตามรายการ' },
  { kind: 'exact', label: 'ระบุยอด' },
  { kind: 'percent', label: 'เปอร์เซ็นต์' },
  { kind: 'shares', label: 'ส่วนแบ่ง' },
];

/** ฟอร์มค่าใช้จ่าย ใช้คลาสวิธีหารชุดเดียวกับ Backend คำนวณตัวอย่างให้เห็นทันทีขณะพิมพ์ */
export class ExpenseModal extends Modal {
  protected readonly title: string;
  private readonly memberIds: string[];
  private kind: Kind = 'equal';
  private title_ = '';
  private amount = '';
  private category = 'food';
  private payerId: string;
  private selected: Set<string>;
  private values: Record<string, string> = {};
  private items: ItemRow[];
  private servicePct = '0';
  private vatPct = '0';
  private busy = false;

  constructor(
    private readonly group: Group, defaultPayerId: string, private readonly existing: Expense | null,
    private readonly onSave: (expense: ExpensePayload) => Promise<void>,
  ) {
    super('modal-lg');
    this.title = existing ? 'แก้ไขรายการ' : 'เพิ่มรายการ';
    this.memberIds = group.listMembers().map((m) => m.id);
    this.payerId = defaultPayerId;
    this.selected = new Set(this.memberIds);
    this.items = [{ name: '', price: '', participantIds: [...this.memberIds] }];
    if (existing) this.loadExisting(existing);
    this.bindEvents();
  }

  private loadExisting(e: Expense): void {
    this.title_ = e.title;
    this.amount = e.amount.toBaht().toFixed(2);
    this.category = e.category;
    this.payerId = e.payerId;
    const split = e.split.toJSON();
    this.kind = split.kind;
    const baht = (s: number) => (s / 100).toFixed(2);
    switch (split.kind) {
      case 'equal': this.selected = new Set(split.participantIds); break;
      case 'exact': this.values = Object.fromEntries(Object.entries(split.amounts).map(([k, v]) => [k, baht(v)])); break;
      case 'percent': this.values = Object.fromEntries(Object.entries(split.percents).map(([k, v]) => [k, String(v)])); break;
      case 'shares': this.values = Object.fromEntries(Object.entries(split.shares).map(([k, v]) => [k, String(v)])); break;
      case 'itemized':
        this.items = split.items.map((i) => ({ name: i.name, price: baht(i.priceSatang), participantIds: [...i.participantIds] }));
        this.servicePct = String(split.servicePct);
        this.vatPct = String(split.vatPct);
        break;
    }
  }

  private bindEvents(): void {
    this.on('click', '[data-kind]', (el) => {
      this.kind = el.dataset.kind as Kind;
      this.values = {};
      this.renderSplit();
      this.root.querySelectorAll('[data-kind]').forEach((b) => b.setAttribute('aria-selected', String(b === el)));
      this.root.querySelector('.amount-field')?.toggleAttribute('hidden', this.kind === 'itemized');
    });
    this.on('click', '[data-category]', (el) => {
      this.category = el.dataset.category!;
      this.root.querySelectorAll('[data-category]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
    });
    this.on('click', '[data-toggle]', (el) => {
      const id = el.dataset.toggle!;
      if (this.selected.has(id)) this.selected.delete(id); else this.selected.add(id);
      el.setAttribute('aria-pressed', String(this.selected.has(id)));
      this.renderPreview();
    });
    this.on('click', '[data-select-all]', () => {
      this.selected = this.selected.size === this.memberIds.length ? new Set() : new Set(this.memberIds);
      this.renderSplit();
    });
    this.on('click', '[data-add-item]', () => {
      this.items.push({ name: '', price: '', participantIds: [...this.memberIds] });
      this.renderSplit();
      this.root.querySelector<HTMLInputElement>(`[data-item-name="${this.items.length - 1}"]`)?.focus();
    });
    this.on('click', '[data-remove-item]', (el) => {
      this.items.splice(Number(el.dataset.removeItem), 1);
      if (this.items.length === 0) this.items.push({ name: '', price: '', participantIds: [...this.memberIds] });
      this.renderSplit();
    });
    this.on('click', '[data-item-person]', (el) => {
      const [row, id] = el.dataset.itemPerson!.split('|');
      const item = this.items[Number(row)];
      item.participantIds = item.participantIds.includes(id) ? item.participantIds.filter((p) => p !== id) : [...item.participantIds, id];
      el.setAttribute('aria-pressed', String(item.participantIds.includes(id)));
      this.renderPreview();
    });
    this.on('input', 'input, select', (el) => this.readField(el as HTMLInputElement));
    this.on('change', 'select', (el) => this.readField(el as unknown as HTMLInputElement));
    this.on('submit', 'form', (_el, event) => {
      event.preventDefault();
      void this.submit();
    });
  }

  private readField(input: HTMLInputElement): void {
    const d = input.dataset;
    if (d.field === 'title') this.title_ = input.value;
    else if (d.field === 'amount') this.amount = input.value;
    else if (d.field === 'payer') this.payerId = input.value;
    else if (d.field === 'service') this.servicePct = input.value;
    else if (d.field === 'vat') this.vatPct = input.value;
    else if (d.value) this.values[d.value] = input.value;
    else if (d.itemName) this.items[Number(d.itemName)].name = input.value;
    else if (d.itemPrice) this.items[Number(d.itemPrice)].price = input.value;
    this.renderPreview();
  }

  /** แปลงค่าจากฟอร์มเป็นข้อมูลวิธีหาร ค่าที่ว่างจะไม่นับเป็นคนร่วมหาร */
  private buildSplit(): SplitData {
    const filled = (convert: (text: string) => number) => {
      const out: Record<string, number> = {};
      for (const id of this.memberIds) {
        const text = this.values[id]?.trim();
        if (text) {
          const value = convert(text);
          if (value > 0) out[id] = value;
        }
      }
      return out;
    };
    const number = (text: string) => {
      const value = Number(text);
      if (!Number.isFinite(value) || value < 0) throw new DomainError('กรอกตัวเลขให้ถูกต้อง');
      return value;
    };
    switch (this.kind) {
      case 'equal': return { kind: 'equal', participantIds: this.memberIds.filter((id) => this.selected.has(id)) };
      case 'exact': return { kind: 'exact', amounts: filled((t) => Money.parse(t).toSatang()) };
      case 'percent': return { kind: 'percent', percents: filled(number) };
      case 'shares': return { kind: 'shares', shares: filled(number) };
      case 'itemized': {
        const rows = this.items.filter((i) => i.price.trim());
        return {
          kind: 'itemized',
          items: rows.map((i) => ({ name: i.name.trim() || 'รายการ', priceSatang: Money.parse(i.price).toSatang(), participantIds: i.participantIds })),
          servicePct: number(this.servicePct || '0'),
          vatPct: number(this.vatPct || '0'),
        };
      }
    }
  }

  private compute(): { total: Money; shares: Map<string, Money>; split: SplitData } {
    const split = this.buildSplit();
    const strategy = createSplit(split);
    const given = this.kind === 'itemized' ? Money.ZERO : this.amount.trim() ? Money.parse(this.amount) : Money.ZERO;
    const total = strategy.resolveTotal(given);
    if (!total.isPositive()) throw new DomainError(this.kind === 'itemized' ? 'กรอกราคาอย่างน้อย 1 รายการ' : 'กรอกยอดเงิน');
    return { total, shares: strategy.split(total), split };
  }

  private async submit(): Promise<void> {
    if (this.busy) return;
    try {
      const { total, split } = this.compute();
      if (!this.title_.trim()) throw new DomainError('กรอกชื่อรายการ');
      this.busy = true;
      await this.onSave({ title: this.title_.trim(), category: this.category, amountSatang: total.toSatang(), payerId: this.payerId, split });
      this.close();
    } catch (error) {
      this.busy = false;
      const box = this.root.querySelector('.form-error') as HTMLElement;
      box.textContent = error instanceof Error ? error.message : 'บันทึกไม่ได้';
      box.hidden = false;
    }
  }

  protected body(): SafeHtml {
    const members = this.group.listMembers();
    return html`
      <form>
        <div class="field-row">
          <label class="grow">ชื่อรายการ
            <input data-field="title" required maxlength="80" placeholder="เช่น หมูกระทะ ค่าน้ำมัน" value="${this.title_}">
          </label>
          <label class="amount-field" ${this.kind === 'itemized' ? html`hidden` : ''}>ยอดเงิน (บาท)
            <input data-field="amount" class="money" inputmode="decimal" placeholder="0.00" value="${this.amount}">
          </label>
        </div>
        <div class="field-row">
          <label class="grow">ใครจ่ายไปก่อน
            <select data-field="payer">
              ${members.map((m) => html`<option value="${m.id}" ${m.id === this.payerId ? html`selected` : ''}>${m.name}</option>`)}
            </select>
          </label>
        </div>
        <fieldset>
          <legend>หมวดหมู่</legend>
          <div class="chips">
            ${Object.entries(CATEGORIES).map(([key, c]) => html`
              <button type="button" class="chip" data-category="${key}" aria-pressed="${key === this.category}">${c.icon} ${c.label}</button>`)}
          </div>
        </fieldset>
        <fieldset>
          <legend>หารแบบไหน</legend>
          <div class="segmented segmented-wrap" role="tablist">
            ${KINDS.map((k) => html`<button type="button" role="tab" data-kind="${k.kind}" aria-selected="${k.kind === this.kind}">${k.label}</button>`)}
          </div>
          <div class="split-panel"></div>
        </fieldset>
        <div class="preview" aria-live="polite"></div>
        <p class="form-error" role="alert" hidden></p>
        <div class="modal-actions">
          ${this.existing && html`<button type="button" class="btn" data-close>ยกเลิก</button>`}
          <button class="btn btn-primary">${this.existing ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}</button>
        </div>
      </form>`;
  }

  protected override afterRender(): void {
    this.renderSplit();
  }

  private renderSplit(): void {
    (this.root.querySelector('.split-panel') as HTMLElement).innerHTML = this.splitPanel().value;
    this.renderPreview();
  }

  private splitPanel(): SafeHtml {
    const members = this.group.listMembers();
    if (this.kind === 'equal') {
      return html`
        <div class="chips">
          ${members.map((m) => html`
            <button type="button" class="chip person" data-toggle="${m.id}" aria-pressed="${this.selected.has(m.id)}">${avatar(m, 'sm')} ${m.name}</button>`)}
          <button type="button" class="btn-link" data-select-all>เลือกทั้งหมด</button>
        </div>`;
    }
    if (this.kind === 'itemized') {
      return html`
        <div class="items">
          ${this.items.map((item, row) => html`
            <div class="item-row">
              <input data-item-name="${row}" placeholder="ชื่อรายการ" aria-label="ชื่อรายการ" value="${item.name}" maxlength="80">
              <input data-item-price="${row}" class="money" inputmode="decimal" placeholder="ราคา" aria-label="ราคา" value="${item.price}">
              <button type="button" class="icon-btn" data-remove-item="${row}" aria-label="ลบรายการ">✕</button>
              <div class="chips chips-tight">
                ${members.map((m) => html`
                  <button type="button" class="chip person" data-item-person="${row}|${m.id}" aria-pressed="${item.participantIds.includes(m.id)}">${avatar(m, 'sm')} ${m.name}</button>`)}
              </div>
            </div>`)}
          <button type="button" class="btn btn-small" data-add-item>เพิ่มรายการอาหาร</button>
          <div class="field-row tax-row">
            <label>Service Charge (%)<input data-field="service" inputmode="decimal" value="${this.servicePct}"></label>
            <label>VAT (%)<input data-field="vat" inputmode="decimal" value="${this.vatPct}"></label>
          </div>
        </div>`;
    }
    const hint = { exact: 'ยอดของแต่ละคน (บาท)', percent: 'เปอร์เซ็นต์ของแต่ละคน รวมให้ได้ 100', shares: 'จำนวนส่วนของแต่ละคน เช่น คนนอนเตียงเดี่ยว 2 ส่วน' }[this.kind];
    return html`
      <p class="muted">${hint} เว้นว่างถ้าไม่ได้ร่วมหาร</p>
      <div class="value-list">
        ${members.map((m) => html`
          <label class="value-row">${avatar(m, 'sm')}<span>${m.name}</span>
            <input data-value="${m.id}" class="money" inputmode="decimal" aria-label="${m.name}" value="${this.values[m.id] ?? ''}">
          </label>`)}
      </div>`;
  }

  private renderPreview(): void {
    const box = this.root.querySelector('.preview') as HTMLElement | null;
    if (!box) return;
    try {
      const { total, shares } = this.compute();
      const rows = this.group.listMembers().filter((m) => shares.get(m.id)?.isPositive());
      box.innerHTML = html`
        <div class="preview-rows">
          ${rows.map((m) => html`<div class="receipt-row"><span>${m.name}</span><span class="money">${shares.get(m.id)!.format()}</span></div>`)}
          <div class="receipt-row receipt-total"><span>รวม</span><span class="money">${total.format()}</span></div>
        </div>`.value;
    } catch (error) {
      box.innerHTML = html`<p class="muted">${error instanceof DomainError ? error.message : ''}</p>`.value;
    }
  }
}
