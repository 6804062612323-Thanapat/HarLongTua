import { html, SafeHtml } from '../core/html';

/** วงกลมสีประจำสมาชิก สีผูกกับตัวบุคคล ไม่เปลี่ยนตามลำดับการแสดงผล */
export function avatar(member: { name: string; color: number }, size: 'sm' | 'md' = 'md'): SafeHtml {
  return html`<span class="avatar avatar-${size} c${member.color % 8}" aria-hidden="true">${Array.from(member.name)[0]}</span>`;
}
