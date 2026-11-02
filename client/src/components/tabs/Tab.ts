import { Group } from '../../../../shared/domain/Group';
import { SafeHtml } from '../../core/html';

/** แท็บในหน้ากลุ่ม GroupPage เรียกทุกแท็บผ่านคลาสแม่นี้ โดยไม่ต้องรู้ว่าเป็นแท็บไหน */
export abstract class Tab {
  abstract readonly label: string;
  abstract markup(group: Group, userId: string): SafeHtml;
}
