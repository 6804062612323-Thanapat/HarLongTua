import { App } from '../core/App';
import { Component } from '../core/Component';

/** หน้าเว็บหนึ่งหน้า คลาสลูกโหลดข้อมูลที่ต้องใช้ใน load() ก่อนจะแสดงผล */
export abstract class Page extends Component {
  protected constructor(protected readonly app: App, className: string) {
    super('main', className);
  }

  async load(): Promise<void> {}
}
