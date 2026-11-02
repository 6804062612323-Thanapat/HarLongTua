import { SafeHtml } from './html';

/** ส่วนแสดงผลทุกชิ้นสืบทอดจากคลาสนี้ คลาสลูกเขียนแค่ template() ว่าหน้าตาเป็นอย่างไร */
export abstract class Component {
  readonly root: HTMLElement;

  protected constructor(tag = 'div', className = '') {
    this.root = document.createElement(tag);
    this.root.className = className;
  }

  protected abstract template(): SafeHtml;

  /** เรียกหลังวาดเสร็จ สำหรับงานที่ต้องใช้ DOM เช่น สร้าง QR */
  protected afterRender(): void {}

  render(): void {
    this.root.innerHTML = this.template().value;
    this.afterRender();
  }

  /** Event Delegation: ผูก Event ที่ root ครั้งเดียว จึงยังทำงานได้แม้วาด HTML ใหม่ */
  protected on<K extends keyof HTMLElementEventMap>(
    type: K, selector: string, handler: (element: HTMLElement, event: HTMLElementEventMap[K]) => void,
  ): void {
    this.root.addEventListener(type, (event) => {
      const target = event.target as Element | null;
      const element = target?.closest<HTMLElement>(selector);
      if (element && this.root.contains(element)) handler(element, event);
    });
  }

  destroy(): void {
    this.root.remove();
  }
}
