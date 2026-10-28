import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

// Find monorepo root by locating pnpm-workspace.yaml
function findRepoRoot() {
  const candidates = [
    scriptDir,
    process.cwd(),
    path.join(process.cwd(), 'EcoSched-Sustainability-Platform'),
  ];

  for (const start of candidates) {
    if (!fs.existsSync(start)) continue;
    let curr = path.resolve(start);
    while (true) {
      if (fs.existsSync(path.join(curr, 'pnpm-workspace.yaml'))) {
        return curr;
      }
      const parent = path.dirname(curr);
      if (parent === curr) break;
      curr = parent;
    }
  }

  // Fallback: parent of scripts directory
  return path.resolve(scriptDir, '..');
}

const repoRoot = findRepoRoot();
console.log(`[build-vercel] Repo root: ${repoRoot}, Current working dir: ${process.cwd()}`);

// Choose pnpm command
function getPnpmExecutable(root) {
  // 1. Check local pnpm bundled in .local-pnpm
  const localPnpmJs = path.join(root, '.local-pnpm', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs');
  if (fs.existsSync(localPnpmJs)) {
    return `"${process.execPath}" "${localPnpmJs}"`;
  }

  // 2. Check local pnpm in .pnpm-local
  const pnpmLocalJs = path.join(root, '.pnpm-local', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs');
  if (fs.existsSync(pnpmLocalJs)) {
    return `"${process.execPath}" "${pnpmLocalJs}"`;
  }

  // 3. Check if global pnpm is available (e.g. on Vercel build containers)
  try {
    execSync('pnpm --version', { stdio: 'ignore' });
    return 'pnpm';
  } catch {
    // 4. Fallback to npx pnpm pinned to version 9.15.0 matching package.json
    return 'npx -y pnpm@9.15.0';
  }
}

const pnpmExecutable = getPnpmExecutable(repoRoot);

// Ensure dependencies are installed in repoRoot if node_modules is missing (e.g. fresh Vercel deployment)
if (!fs.existsSync(path.join(repoRoot, 'node_modules')) || !fs.existsSync(path.join(repoRoot, 'artifacts/ecosched/node_modules'))) {
  console.log(`[build-vercel] Installing dependencies using ${pnpmExecutable}...`);
  execSync(`${pnpmExecutable} install --no-frozen-lockfile`, {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

console.log(`[build-vercel] Building @workspace/ecosched using ${pnpmExecutable}...`);
execSync(`${pnpmExecutable} --filter @workspace/ecosched build`, {
  cwd: repoRoot,
  stdio: 'inherit',
});

// Build api-server as well
try {
  console.log(`[build-vercel] Building @workspace/api-server...`);
  execSync(`"${process.execPath}" ./build.mjs`, {
    cwd: path.join(repoRoot, 'artifacts/api-server'),
    stdio: 'inherit',
  });
} catch (err) {
  console.warn(`[build-vercel] Note: api-server build step warning:`, err.message);
}

const srcDir = path.join(repoRoot, 'artifacts/ecosched/dist/public');

// Populate all possible output directory locations expected by Vercel presets
const targetDirs = Array.from(new Set([
  path.join(repoRoot, 'public'),
  path.join(repoRoot, 'dist'),
  path.join(repoRoot, 'artifacts/api-server/public'),
  path.join(repoRoot, 'artifacts/api-server/dist/public'),
  path.join(process.cwd(), 'public'),
  path.join(process.cwd(), 'dist'),
]));

for (const dir of targetDirs) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.cpSync(srcDir, dir, { recursive: true });
    console.log(`[build-vercel] Populated ${dir}`);
  } catch (err) {
    console.warn(`[build-vercel] Could not copy to ${dir}:`, err.message);
  }
}

// Ensure pre-bundled API entrypoints exist (pure JS so Vercel does not run tsc on unbundled TS)
const handlerSource = path.join(repoRoot, 'artifacts/api-server/dist/vercel-handler.mjs');
const apiDirs = Array.from(new Set([
  path.join(repoRoot, 'api'),
  path.join(repoRoot, 'artifacts/api-server/api'),
  path.join(repoRoot, 'artifacts/ecosched/api'),
  path.join(process.cwd(), 'api'),
]));

for (const dir of apiDirs) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    // Remove any .ts files in api dir to prevent Vercel from attempting tsc compilation
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.endsWith('.ts')) {
        fs.unlinkSync(path.join(dir, file));
      }
    }
    // Copy bundled vercel-handler to index.js
    if (fs.existsSync(handlerSource)) {
      fs.copyFileSync(handlerSource, path.join(dir, 'index.js'));
      console.log(`[build-vercel] Deployed bundled API handler to ${path.join(dir, 'index.js')}`);
    }
  } catch (err) {
    console.warn(`[build-vercel] Note on API handler in ${dir}:`, err.message);
  }
}

console.log('[build-vercel] Build complete. Ready for Vercel deployment.');

