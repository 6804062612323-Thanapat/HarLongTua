/** ข้อผิดพลาดจากกฎของระบบ เช่น หารเปอร์เซ็นต์รวมไม่ครบ 100 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
