import 'node:process';
process.loadEnvFile?.('.env');
await import('./main');
