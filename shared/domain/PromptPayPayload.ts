import { Money } from './Money';
import { DomainError } from './DomainError';

export function isValidPromptPayTarget(target: string): boolean {
  return /^(0\d{9}|\d{13}|\d{15})$/.test(target);
}

/**
 * สร้างข้อความสำหรับ QR พร้อมเพย์ตามมาตรฐาน EMVCo
 * แต่ละช่องเป็นรูปแบบ TLV คือ รหัส 2 หลัก + ความยาว 2 หลัก + ค่า
 */
export class PromptPayPayload {
  private static readonly AID = 'A000000677010111';

  constructor(private readonly target: string, private readonly amount?: Money) {
    if (!isValidPromptPayTarget(target)) throw new DomainError('เลขพร้อมเพย์ไม่ถูกต้อง');
  }

  toString(): string {
    const merchant = this.field('00', PromptPayPayload.AID) + this.targetField();
    const body = [
      this.field('00', '01'),
      this.field('01', this.amount ? '12' : '11'), // 12 = QR ใช้ครั้งเดียว ระบุยอด
      this.field('29', merchant),
      this.field('58', 'TH'),
      this.field('53', '764'), // สกุลเงินบาท
      this.amount ? this.field('54', this.amount.toBaht().toFixed(2)) : '',
    ].join('') + '6304';
    return body + PromptPayPayload.crc16(body);
  }

  private field(id: string, value: string): string {
    return id + String(value.length).padStart(2, '0') + value;
  }

  private targetField(): string {
    if (this.target.length === 10) {
      return this.field('01', '0066' + this.target.slice(1));
    }
    return this.field(this.target.length === 13 ? '02' : '03', this.target);
  }

  /** CRC-16/CCITT-FALSE ใช้ตรวจว่าข้อมูลใน QR ไม่เสียหาย */
  static crc16(text: string): string {
    let crc = 0xffff;
    for (let i = 0; i < text.length; i++) {
      crc ^= text.charCodeAt(i) << 8;
      for (let bit = 0; bit < 8; bit++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
}
