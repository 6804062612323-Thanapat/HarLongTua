import { Group } from '../domain/Group';
import { Expense } from '../domain/transaction/Expense';
import { Payment } from '../domain/transaction/Payment';
import { Exporter } from './Exporter';

/** ไฟล์ CSV เปิดใน Excel ได้ ใส่ BOM เพื่อให้ภาษาไทยแสดงถูกต้อง */
export class CsvExporter extends Exporter {
  readonly fileName = 'transactions.csv';
  readonly mimeType = 'text/csv;charset=utf-8';

  export(group: Group): string {
    const name = (id: string) => group.getMember(id).name;
    const rows = [['วันที่', 'ประเภท', 'รายการ', 'ผู้จ่าย', 'ผู้รับ/วิธีหาร', 'ยอด (บาท)']];
    for (const tx of group.listTransactions()) {
      if (tx instanceof Expense) {
        rows.push([tx.date.slice(0, 10), 'ค่าใช้จ่าย', tx.title, name(tx.payerId), tx.split.label, tx.amount.toBaht().toFixed(2)]);
      } else if (tx instanceof Payment) {
        rows.push([tx.date.slice(0, 10), 'โอนคืน', '', name(tx.fromId), name(tx.toId), tx.amount.toBaht().toFixed(2)]);
      }
    }
    return '﻿' + rows.map((r) => r.map(CsvExporter.escape).join(',')).join('\r\n');
  }

  /** ใส่ ' หน้าค่าที่ขึ้นต้นด้วยสัญลักษณ์สูตร กัน Excel รันเป็นสูตร */
  private static escape(value: string): string {
    const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  }
}
