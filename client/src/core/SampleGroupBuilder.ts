import { ApiClient } from './ApiClient';

/** สร้างกลุ่มตัวอย่างผ่าน API จริง ให้ลองใช้งานได้ทันทีโดยไม่ต้องกรอกเอง */
export class SampleGroupBuilder {
  constructor(private readonly api: ApiClient, private readonly userName: string) {}

  async build(): Promise<string> {
    let group = await this.api.createGroup('ทริปเขาใหญ่ (ตัวอย่าง)');
    const id = group.id;
    for (const name of ['บี', 'ต้น', 'ฟ้า'].filter((n) => n !== this.userName)) {
      group = await this.api.addMember(id, name);
    }
    const ids = group.members.map((m) => m.id);
    const [me, b, c, d] = ids;
    await this.api.addExpense(id, { title: 'ค่าที่พัก 2 คืน', category: 'stay', amountSatang: 480000, payerId: me, split: { kind: 'shares', shares: Object.fromEntries(ids.map((m, i) => [m, i === 0 ? 2 : 1])) } });
    await this.api.addExpense(id, { title: 'ค่าน้ำมันและทางด่วน', category: 'travel', amountSatang: 150000, payerId: b, split: { kind: 'equal', participantIds: ids } });
    await this.api.addExpense(id, {
      title: 'ร้านอาหารริมเขา', category: 'food', amountSatang: 0, payerId: c,
      split: {
        kind: 'itemized', servicePct: 10, vatPct: 7,
        items: [
          { name: 'ต้มยำกุ้ง', priceSatang: 32000, participantIds: ids },
          { name: 'สเต็กเนื้อ', priceSatang: 45000, participantIds: [me, b] },
          { name: 'ผัดผักรวม', priceSatang: 16000, participantIds: [c, d] },
        ],
      },
    });
    await this.api.addExpense(id, { title: 'ตั๋วฟาร์มโชคชัย', category: 'fun', amountSatang: 120000, payerId: d, split: { kind: 'equal', participantIds: ids } });
    return id;
  }
}
