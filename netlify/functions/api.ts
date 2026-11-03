import mongoose from 'mongoose';
import serverless from 'serverless-http';
import { createApp } from '../../server/app';
import { Config } from '../../server/config';
import { MongoGroupRepository, MongoUserRepository } from '../../server/repositories/MongoRepositories';

/** จุดเริ่มสำหรับ Netlify Functions ใช้การเชื่อมต่อฐานข้อมูลเดิมซ้ำเมื่อ Function ยังทำงานอยู่ */
const config = new Config();
const app = createApp({
  users: new MongoUserRepository(),
  groups: new MongoGroupRepository(),
  jwtSecret: config.jwtSecret,
  isProduction: true, // Netlify ให้บริการผ่าน HTTPS เสมอ
});

const run = serverless(app);
let connection: Promise<unknown> | undefined;

function connect(): Promise<unknown> {
  connection ??= mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 }).catch((error) => {
    connection = undefined; // ครั้งถัดไปจะลองเชื่อมต่อใหม่
    throw error;
  });
  return connection;
}

export async function handler(event: { path: string }, context: { callbackWaitsForEmptyEventLoop?: boolean }) {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await connect();
  } catch (error) {
    console.error(error);
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'เชื่อมต่อฐานข้อมูลไม่ได้ ลองใหม่อีกครั้ง' }),
    };
  }
  // เส้นทางอาจมาเป็น /.netlify/functions/api/... จึงแปลงให้ตรงกับเส้นทาง /api/... ของ Express
  event.path = event.path.replace(/^\/\.netlify\/functions\/api/, '/api');
  return run(event as never, context as never);
}
