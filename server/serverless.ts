import type { IncomingMessage, ServerResponse } from 'node:http';
import mongoose from 'mongoose';
import { createApp } from './app';
import { Config } from './config';
import { MongoGroupRepository, MongoUserRepository } from './repositories/MongoRepositories';

/** จุดเริ่มสำหรับ Vercel ใช้การเชื่อมต่อฐานข้อมูลเดิมซ้ำเมื่อ Function ยังทำงานอยู่ ไม่เปิดใหม่ทุกคำขอ */
const config = new Config();
const app = createApp({
  users: new MongoUserRepository(),
  groups: new MongoGroupRepository(),
  jwtSecret: config.jwtSecret,
  isProduction: config.isProduction,
});

let connection: Promise<unknown> | undefined;

function connect(): Promise<unknown> {
  connection ??= mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 }).catch((error) => {
    connection = undefined; // ครั้งถัดไปจะลองเชื่อมต่อใหม่
    throw error;
  });
  return connection;
}

/** กฎ rewrite ของ Vercel อาจส่ง /api?path=auth/me มา จึงแปลงกลับเป็น /api/auth/me ให้ Express */
function originalUrl(url: string): string {
  const parsed = new URL(url, 'http://local');
  const path = parsed.searchParams.get('path');
  if (parsed.pathname !== '/api' || !path) return url;
  parsed.searchParams.delete('path');
  return `/api/${path}${parsed.search}`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    await connect();
  } catch (error) {
    console.error(error);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'เชื่อมต่อฐานข้อมูลไม่ได้ ลองใหม่อีกครั้ง' }));
    return;
  }
  req.url = originalUrl(req.url ?? '/');
  app(req as never, res as never);
}
