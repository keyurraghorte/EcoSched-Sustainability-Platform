import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const isWindows = process.platform === 'win32';
const pnpmExecutable = isWindows
  ? (fs.existsSync(path.resolve('.local-pnpm/pnpm.exe'))
      ? `"${path.resolve('.local-pnpm/pnpm.exe')}"`
      : 'npx pnpm')
  : 'pnpm';

console.log(`[build-vercel] Building @workspace/ecosched using ${pnpmExecutable}...`);
execSync(`${pnpmExecutable} --filter @workspace/ecosched build`, { stdio: 'inherit' });

const srcDir = path.resolve('artifacts/ecosched/dist/public');
const publicDir = path.resolve('public');
const distDir = path.resolve('dist');

console.log('[build-vercel] Ensuring build outputs exist in public and dist...');
fs.mkdirSync(publicDir, { recursive: true });
fs.cpSync(srcDir, publicDir, { recursive: true });

fs.mkdirSync(distDir, { recursive: true });
fs.cpSync(srcDir, distDir, { recursive: true });

console.log('[build-vercel] Build complete. Output available in public, dist, and artifacts/ecosched/dist/public.');
