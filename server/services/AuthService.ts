import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { BadRequestError, UnauthorizedError } from '../errors';
import { UserRecord, UserRepository } from '../repositories/repositories';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
}

/** สมัครสมาชิก ล็อกอิน และออก Token รหัสผ่านเก็บเป็น bcrypt hash เท่านั้น */
export class AuthService {
  private static readonly HASH_ROUNDS = 10;
  private static readonly TOKEN_DAYS = 30;

  constructor(private readonly users: UserRepository, private readonly jwtSecret: string) {}

  async register(email: string, password: string, name: string): Promise<PublicUser> {
    if (password.length < 8) throw new BadRequestError('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
    const passwordHash = await bcrypt.hash(password, AuthService.HASH_ROUNDS);
    return this.toPublic(await this.users.create({ email: AuthService.normalize(email), name: name.trim(), passwordHash }));
  }

  async login(email: string, password: string): Promise<PublicUser> {
    const user = await this.users.findByEmail(AuthService.normalize(email));
    // ใช้ข้อความเดียวกันทั้งสองกรณี เพื่อไม่บอกว่าอีเมลนี้มีอยู่ในระบบหรือไม่
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
    return this.toPublic(user);
  }

  issueToken(user: PublicUser): string {
    return jwt.sign({ sub: user.id }, this.jwtSecret, { expiresIn: `${AuthService.TOKEN_DAYS}d`, algorithm: 'HS256' });
  }

  async verifyToken(token: string): Promise<PublicUser> {
    let userId: string;
    try {
      userId = String(jwt.verify(token, this.jwtSecret, { algorithms: ['HS256'] }).sub);
    } catch {
      throw new UnauthorizedError('กรุณาเข้าสู่ระบบใหม่');
    }
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedError('กรุณาเข้าสู่ระบบใหม่');
    return this.toPublic(user);
  }

  private static normalize(email: string): string {
    return email.trim().toLowerCase();
  }

  private toPublic(user: UserRecord): PublicUser {
    return { id: user.id, email: user.email, name: user.name };
  }
}
