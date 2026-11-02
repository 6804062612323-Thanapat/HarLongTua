import { Group } from '../domain/Group';
import { Exporter } from './Exporter';

/** ข้อความสรุปสำหรับวางในแชท LINE */
export class TextSummaryExporter extends Exporter {
  readonly fileName = 'summary.txt';
  readonly mimeType = 'text/plain';

  export(group: Group): string {
    const name = (id: string) => group.getMember(id).name;
    const lines = [`สรุปค่าใช้จ่าย ${group.name}`, `รวมทั้งหมด ${group.totalSpent().format()} บาท`, ''];
    const transfers = group.settle();
    if (transfers.length === 0) {
      lines.push('ไม่มียอดค้างโอน');
    } else {
      lines.push('ใครต้องโอนให้ใคร');
      transfers.forEach((t) => lines.push(`${name(t.fromId)} โอนให้ ${name(t.toId)} ${t.amount.format()} บาท`));
    }
    return lines.join('\n');
  }
}
