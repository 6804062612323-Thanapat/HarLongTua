/** ค่าตั้งของเซิร์ฟเวอร์ อ่านจาก Environment Variables และหยุดทันทีถ้าตั้งค่าไม่ครบ */
export class Config {
  readonly mongoUri: string;
  readonly jwtSecret: string;
  readonly port: number;
  readonly isProduction: boolean;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.mongoUri = Config.required(env, 'MONGODB_URI');
    this.jwtSecret = Config.required(env, 'JWT_SECRET');
    if (this.jwtSecret.length < 32) throw new Error('JWT_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร');
    this.port = Number(env.PORT ?? 3000);
    this.isProduction = env.NODE_ENV === 'production';
  }

  private static required(env: NodeJS.ProcessEnv, key: string): string {
    const value = env[key];
    if (!value) throw new Error(`ยังไม่ได้ตั้งค่า ${key} (ดูตัวอย่างที่ .env.example)`);
    return value;
  }
}
