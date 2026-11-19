// Menjalankan Studio DST (port 3000) dan website Preluxes (port 3001) sekaligus.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const siteDir = path.join(root, 'sites', 'preluxes');
const sitePort = process.env.PRELUXES_PORT || '3001';
const siteUrl = process.env.PRELUXES_SITE_URL || `http://localhost:${sitePort}`;

if (!fs.existsSync(path.join(siteDir, 'node_modules'))) {
  console.error('Dependensi website belum terpasang. Jalankan dulu: npm run install:site');
  process.exit(1);
}

const children = [
  spawn(process.execPath, [path.join(siteDir, 'node_modules', 'tsx', 'dist', 'cli.mjs'), 'server.ts'], {
    cwd: siteDir,
    stdio: 'inherit',
    env: { ...process.env, PORT: sitePort, APP_URL: siteUrl, HMR_PORT: '24679' },
  }),
  spawn(process.execPath, [path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs'), 'server.ts'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PORT: process.env.PORT || '3000', PRELUXES_SITE_URL: siteUrl },
  }),
];

const stop = () => children.forEach((c) => c.kill('SIGTERM'));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
children.forEach((c) =>
  c.on('exit', (code) => {
    if (code && code !== 0) {
      stop();
      process.exit(code);
    }
  })
);
