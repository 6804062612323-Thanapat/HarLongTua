import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '../../shared/domain/DomainError';
import { HttpError } from '../errors';

/** แปลงข้อผิดพลาดทุกชนิดเป็น JSON และไม่เปิดเผยรายละเอียดภายในของเซิร์ฟเวอร์ */
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
  } else if (error instanceof DomainError) {
    res.status(400).json({ error: error.message });
  } else if (error instanceof ZodError) {
    res.status(400).json({ error: error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
  } else {
    console.error(error);
    res.status(500).json({ error: 'ระบบขัดข้อง ลองใหม่อีกครั้ง' });
  }
}
