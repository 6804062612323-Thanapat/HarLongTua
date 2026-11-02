import { Router } from 'express';

/** Controller ทุกตัวมี Router ของตัวเอง และบังคับให้คลาสลูกกำหนดเส้นทาง */
export abstract class BaseController {
  readonly router = Router({ mergeParams: true });

  protected abstract registerRoutes(): void;

  /** เรียกหลังสร้างวัตถุเสร็จ เพื่อให้ Parameter Property ของคลาสลูกพร้อมใช้งานแล้ว */
  build(): Router {
    this.registerRoutes();
    return this.router;
  }
}
