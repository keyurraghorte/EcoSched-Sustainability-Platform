import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Find monorepo root by locating pnpm-workspace.yaml
let currentDir = process.cwd();
while (currentDir !== path.dirname(currentDir)) {
  if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
    break;
  }
  currentDir = path.dirname(currentDir);
}
const repoRoot = currentDir;
console.log(`[build-vercel] Repo root: ${repoRoot}, Current working dir: ${process.cwd()}`);

// Choose pnpm command
const isWindows = process.platform === 'win32';
const pnpmExecutable = isWindows
  ? (fs.existsSync(path.join(repoRoot, '.local-pnpm/pnpm.exe'))
      ? `"${path.join(repoRoot, '.local-pnpm/pnpm.exe')}"`
      : 'npx pnpm')
  : 'pnpm';

console.log(`[build-vercel] Building @workspace/ecosched using ${pnpmExecutable}...`);
execSync(`${pnpmExecutable} --filter @workspace/ecosched build`, {
  cwd: repoRoot,
  stdio: 'inherit',
});

// Build api-server as well
try {
  console.log(`[build-vercel] Building @workspace/api-server...`);
  execSync(`node ./build.mjs`, {
    cwd: path.join(repoRoot, 'artifacts/api-server'),
    stdio: 'inherit',
  });
} catch (err) {
  console.warn(`[build-vercel] Note: api-server build step warning:`, err.message);
}

const srcDir = path.join(repoRoot, 'artifacts/ecosched/dist/public');

// Populate all possible output directory locations expected by Vercel presets
const targetDirs = [
  path.join(repoRoot, 'public'),
  path.join(repoRoot, 'dist'),
  path.join(process.cwd(), 'public'),
  path.join(process.cwd(), 'dist'),
  path.join(repoRoot, 'artifacts/api-server/public'),
  path.join(repoRoot, 'artifacts/api-server/dist/public'),
];

for (const dir of targetDirs) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.cpSync(srcDir, dir, { recursive: true });
    console.log(`[build-vercel] Populated ${dir}`);
  } catch (err) {
    console.warn(`[build-vercel] Could not copy to ${dir}:`, err.message);
  }
}

console.log('[build-vercel] Build complete. Ready for Vercel deployment.');
