import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { createApp } from './app';
import { Config } from './config';
import { MongoGroupRepository, MongoUserRepository } from './repositories/MongoRepositories';

async function main(): Promise<void> {
  const config = new Config();
  await mongoose.connect(config.mongoUri);
  const here = path.dirname(fileURLToPath(import.meta.url));
  const app = createApp({
    users: new MongoUserRepository(),
    groups: new MongoGroupRepository(),
    jwtSecret: config.jwtSecret,
    isProduction: config.isProduction,
    clientDir: path.resolve(here, '../client'),
  });
  app.listen(config.port, () => console.log(`หารลงตัว พร้อมใช้งานที่พอร์ต ${config.port}`));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
