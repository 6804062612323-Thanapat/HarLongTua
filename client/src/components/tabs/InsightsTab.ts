import { CATEGORIES } from '../../../../shared/domain/categories';
import { Group } from '../../../../shared/domain/Group';
import { Money } from '../../../../shared/domain/Money';
import { html, SafeHtml } from '../../core/html';
import { Tab } from './Tab';

export class InsightsTab extends Tab {
  readonly label = 'สรุป';

  markup(group: Group): SafeHtml {
    if (group.expenses().length === 0) {
      return html`<div class="empty"><p>เพิ่มรายการก่อน แล้วสรุปจะแสดงที่นี่</p></div>`;
    }
    const byCategory = [...group.spentByCategory()].map(([key, amount]) => ({
      label: `${CATEGORIES[key]?.icon ?? ''} ${CATEGORIES[key]?.label ?? key}`, amount,
    }));
    const byMember = [...group.spentByMember()].map(([id, amount]) => ({ label: group.getMember(id).name, amount }));
    return html`
      <h3 class="chart-title">แยกตามหมวดหมู่</h3>
      ${this.bars(byCategory)}
      <h3 class="chart-title">แต่ละคนใช้ไปเท่าไหร่</h3>
      <p class="muted">นับเฉพาะส่วนของตัวเอง ไม่นับที่ออกให้เพื่อน</p>
      ${this.bars(byMember)}`;
  }

  /** กราฟแท่งแนวนอนแบบ HTML ใช้สีเดียว เรียงจากมากไปน้อย และมีตัวเลขกำกับทุกแท่ง */
  private bars(rows: { label: string; amount: Money }[]): SafeHtml {
    const sorted = rows.sort((a, b) => b.amount.compareTo(a.amount));
    const max = Math.max(1, sorted[0]?.amount.toSatang() ?? 1);
    const total = Money.sum(sorted.map((r) => r.amount)).toSatang() || 1;
    return html`
      <ul class="bars">
        ${sorted.map((r) => {
          const pct = Math.round((r.amount.toSatang() / total) * 100);
          return html`
            <li class="bar-row" title="${r.label}: ${r.amount.format()} บาท (${pct}%)">
              <span class="bar-label">${r.label}</span>
              <span class="bar-track"><span class="bar-fill" style="width:${(r.amount.toSatang() / max) * 100}%"></span></span>
              <span class="money bar-value">${r.amount.format()}</span>
            </li>`;
        })}
      </ul>`;
  }
}
