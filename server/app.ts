import path from 'node:path';
import cookieParser from 'cookie-parser';
import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import { AuthController } from './controllers/AuthController';
import { GroupController } from './controllers/GroupController';
import { errorHandler } from './middleware/errorHandler';
import { GroupRepository, UserRepository } from './repositories/repositories';
import { AuthService } from './services/AuthService';
import { GroupService } from './services/GroupService';

export interface AppOptions {
  users: UserRepository;
  groups: GroupRepository;
  jwtSecret: string;
  isProduction: boolean;
  clientDir?: string;
  rateLimitMax?: number;
}

/** ประกอบทุกส่วนของเซิร์ฟเวอร์เข้าด้วยกัน ส่งฐานข้อมูลเข้ามาจากภายนอก (Dependency Injection) */
export function createApp(options: AppOptions): Express {
  const app = express();
  const auth = new AuthService(options.users, options.jwtSecret);
  const groups = new GroupService(options.groups);

  app.set('trust proxy', 1); // Render มี Proxy คั่นหน้า 1 ชั้น
  app.use(helmet());
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req: Request, res: Response) => { res.json({ ok: true }); });
  app.use('/api/auth', new AuthController(auth, options.isProduction, options.rateLimitMax ?? 30).build());
  app.use('/api', new GroupController(auth, groups).build());
  app.use('/api', (_req: Request, res: Response) => { res.status(404).json({ error: 'ไม่พบ API นี้' }); });

  if (options.clientDir) {
    const clientDir = options.clientDir;
    app.use(express.static(clientDir));
    app.get(/.*/, (_req: Request, res: Response) => { res.sendFile(path.join(clientDir, 'index.html')); });
  }

  app.use(errorHandler);
  return app;
}
