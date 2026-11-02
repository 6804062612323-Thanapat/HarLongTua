import { Money } from '../Money';
import { DomainError } from '../DomainError';

export type SplitData =
  | { kind: 'equal'; participantIds: string[] }
  | { kind: 'exact'; amounts: Record<string, number> }
  | { kind: 'percent'; percents: Record<string, number> }
  | { kind: 'shares'; shares: Record<string, number> }
  | { kind: 'itemized'; items: ItemData[]; servicePct: number; vatPct: number };

export interface ItemData {
  name: string;
  priceSatang: number;
  participantIds: string[];
}

/**
 * วิธีหารเงิน: คลาสแม่กำหนดขั้นตอนหลักใน split() (Template Method)
 * ส่วนคลาสลูกเขียนเฉพาะวิธีคำนวณของตัวเอง
 */
export abstract class SplitStrategy {
  abstract readonly kind: SplitData['kind'];
  abstract readonly label: string;

  abstract participantIds(): string[];
  protected abstract computeShares(total: Money): Map<string, Money>;
  abstract toJSON(): SplitData;

  /** ยอดรวมของบิล วิธีส่วนใหญ่ใช้ยอดที่ผู้ใช้กรอก */
  resolveTotal(given: Money): Money {
    return given;
  }

  /** คำนวณส่วนของแต่ละคน แล้วตรวจว่ารวมกันเท่ายอดบิลพอดี */
  split(total: Money): Map<string, Money> {
    if (this.participantIds().length === 0) throw new DomainError('เลือกคนร่วมหารอย่างน้อย 1 คน');
    const shares = this.computeShares(total);
    if (!Money.sum([...shares.values()]).equals(total)) {
      throw new DomainError(`ยอดของแต่ละคนรวมกันต้องเท่ากับ ${total.format()} บาท`);
    }
    return shares;
  }

  /** ใช้โดยคลาสลูก: แบ่งยอดตามน้ำหนักให้สมาชิกแต่ละคน */
  protected allocateByWeight(total: Money, ids: string[], weights: number[]): Map<string, Money> {
    const parts = total.allocate(weights);
    return new Map(ids.map((id, i) => [id, parts[i]]));
  }
}
