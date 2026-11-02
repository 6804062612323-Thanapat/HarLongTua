import { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { AuthedRequest, COOKIE_NAME, requireAuth } from '../middleware/auth';
import { AuthService, PublicUser } from '../services/AuthService';
import { BaseController } from './BaseController';

const registerBody = z.object({
  email: z.email('กรอกอีเมลให้ถูกต้อง').max(254),
  password: z.string().min(8, 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร').max(72, 'รหัสผ่านยาวเกิน 72 ตัวอักษร'),
  name: z.string().trim().min(1, 'กรอกชื่อ').max(30, 'ชื่อยาวเกิน 30 ตัวอักษร'),
});
const loginBody = z.object({ email: z.string().max(254), password: z.string().max(72) });

export class AuthController extends BaseController {
  constructor(private readonly auth: AuthService, private readonly secureCookie: boolean, private readonly rateLimitMax: number) {
    super();
  }

  protected registerRoutes(): void {
    // จำกัดจำนวนครั้ง กันการเดารหัสผ่าน
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, limit: this.rateLimitMax, standardHeaders: true, legacyHeaders: false,
      message: { error: 'ลองหลายครั้งเกินไป รอ 15 นาทีแล้วลองใหม่' },
    });
    this.router.post('/register', limiter, this.register);
    this.router.post('/login', limiter, this.login);
    this.router.post('/logout', this.logout);
    this.router.get('/me', requireAuth(this.auth), this.me);
  }

  private register = async (req: Request, res: Response) => {
    const { email, password, name } = registerBody.parse(req.body);
    this.startSession(res, await this.auth.register(email, password, name), 201);
  };

  private login = async (req: Request, res: Response) => {
    const { email, password } = loginBody.parse(req.body);
    this.startSession(res, await this.auth.login(email, password), 200);
  };

  private logout = (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME).status(204).end();
  };

  private me = (req: Request, res: Response) => {
    res.json({ user: (req as AuthedRequest).user });
  };

  /** เก็บ Token ใน Cookie แบบ httpOnly โค้ด JavaScript บนหน้าเว็บจึงอ่านไม่ได้ */
  private startSession(res: Response, user: PublicUser, status: number): void {
    res.cookie(COOKIE_NAME, this.auth.issueToken(user), {
      httpOnly: true, sameSite: 'lax', secure: this.secureCookie, maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.status(status).json({ user });
  }
}
