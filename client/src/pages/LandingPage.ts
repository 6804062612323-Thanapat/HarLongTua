import { AuthForm } from '../components/AuthForm';
import { App } from '../core/App';
import { html, SafeHtml } from '../core/html';
import { Page } from './Page';

/** หน้าแรกสำหรับคนที่ยังไม่ล็อกอิน */
export class LandingPage extends Page {
  private readonly form: AuthForm;

  constructor(app: App) {
    super(app, 'landing');
    this.form = new AuthForm(app);
  }

  protected template(): SafeHtml {
    return html`
      <section class="landing-copy">
        <p class="brand">หารลงตัว</p>
        <h1>กินด้วยกัน เที่ยวด้วยกัน แล้วหารให้ตรงทุกสตางค์</h1>
        <p class="lede">จดว่าใครจ่ายอะไร เว็บจะบอกว่าใครต้องโอนให้ใคร ด้วยจำนวนครั้งที่น้อยลง แล้วสแกน QR พร้อมเพย์จ่ายได้เลย</p>
        <div class="form-slot"></div>
      </section>
      <section class="landing-demo" aria-label="ตัวอย่างสรุปการโอน">
        <div class="receipt">
          <h2>ทริปเขาใหญ่</h2>
          <p class="muted">เพื่อน 4 คน 3 รายการ</p>
          <div class="receipt-row"><span>ค่าที่พัก</span><span class="money">4,800.00</span></div>
          <div class="receipt-row"><span>หมูกระทะ</span><span class="money">1,265.00</span></div>
          <div class="receipt-row"><span>ค่าน้ำมัน</span><span class="money">1,500.00</span></div>
          <div class="receipt-row receipt-total"><span>รวม</span><span class="money">7,565.00</span></div>
          <p class="receipt-heading">ใครโอนให้ใคร</p>
          <div class="receipt-row"><span>บี โอนให้ มายด์</span><span class="money">1,891.25</span></div>
          <div class="receipt-row"><span>เจ โอนให้ มายด์</span><span class="money">626.25</span></div>
          <div class="receipt-row"><span>ต้น โอนให้ มายด์</span><span class="money">391.25</span></div>
          <div class="stamp stamp-animate" aria-hidden="true">หารลงตัว</div>
        </div>
      </section>`;
  }

  protected override afterRender(): void {
    this.root.querySelector('.form-slot')!.append(this.form.root);
    this.form.render();
  }
}
