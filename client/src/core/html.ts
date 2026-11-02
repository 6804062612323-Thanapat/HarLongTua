/** ข้อความ HTML ที่ตรวจแล้วว่าปลอดภัย */
export class SafeHtml {
  constructor(readonly value: string) {}
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function stringify(value: unknown): string {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(stringify).join('');
  return escape(String(value));
}

/** สร้าง HTML โดย Escape ทุกค่าที่แทรกเข้าไป ชื่อที่ผู้ใช้พิมพ์จึงกลายเป็นโค้ดบนหน้าเว็บไม่ได้ (กัน XSS) */
export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  return new SafeHtml(strings.reduce((out, part, i) => out + part + (i < values.length ? stringify(values[i]) : ''), ''));
}
