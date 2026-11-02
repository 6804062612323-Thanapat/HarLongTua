import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../errors';
import { AuthService, PublicUser } from '../services/AuthService';

export const COOKIE_NAME = 'hlt_session';

export type AuthedRequest = Request & { user: PublicUser };

export function requireAuth(auth: AuthService) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) throw new UnauthorizedError('กรุณาเข้าสู่ระบบ');
    (req as AuthedRequest).user = await auth.verifyToken(token);
    next();
  };
}
