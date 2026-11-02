import { Group } from '../domain/Group';

/** ส่งออกข้อมูลกลุ่ม คลาสลูกกำหนดรูปแบบไฟล์ของตัวเอง */
export abstract class Exporter {
  abstract readonly fileName: string;
  abstract readonly mimeType: string;
  abstract export(group: Group): string;
}
