import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptsDir, "..");
if (typeof process.loadEnvFile === "function" && fs.existsSync(path.join(root, ".env"))) {
  process.loadEnvFile(path.join(root, ".env"));
}
const frontendEnv = path.join(root, "artifacts", "ecosched", ".env.local");
if (typeof process.loadEnvFile === "function" && fs.existsSync(frontendEnv)) {
  process.loadEnvFile(frontendEnv);
}
const args = new Set(process.argv.slice(2));
const webOnly = args.has("--web-only");
const apiOnly = args.has("--api-only");

const apiDir = path.join(root, "artifacts", "api-server");
const webDir = path.join(root, "artifacts", "ecosched");
const possibleViteBins = [
  path.join(webDir, "node_modules", "vite", "bin", "vite.js"),
  path.join(root, "node_modules", "vite", "bin", "vite.js"),
];
const viteBin = possibleViteBins.find((p) => fs.existsSync(p)) || possibleViteBins[0];

function fail(message) {
  console.error(`\n[dev] ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(path.join(root, "node_modules"))) {
  fail(
    "Dependencies are missing. From EcoSched-Sustainability-Platform run: npx pnpm install",
  );
}

if (!webOnly && !fs.existsSync(path.join(apiDir, "build.mjs"))) {
  fail("API server files were not found.");
}

if (!apiOnly && !fs.existsSync(viteBin)) {
  fail(
    "Vite is not installed. From EcoSched-Sustainability-Platform run: npx pnpm install",
  );
}

const children = [];

function start(name, command, commandArgs, options) {
  console.log(`[dev] starting ${name}...`);
  const child = spawn(command, commandArgs, {
    stdio: "inherit",
    windowsHide: false,
    ...options,
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    if (code !== 0) {
      console.error(
        `[dev] ${name} exited unexpectedly (${signal || code}). Stopping other processes.`,
      );
      shutdown(code || 1);
    }
  });
  return child;
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

if (!webOnly) {
  console.log("[dev] building API server...");
  const build = spawnSync(process.execPath, ["./build.mjs"], {
    cwd: apiDir,
    stdio: "inherit",
    env: process.env,
  });
  if (build.status !== 0) {
    fail("API server build failed.");
  }

  start(
    "api",
    process.execPath,
    ["--enable-source-maps", "./dist/index.mjs"],
    {
      cwd: apiDir,
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || "development",
        PORT: process.env.API_PORT || "5000",
      },
    },
  );
}

if (!apiOnly) {
  start(
    "web",
    process.execPath,
    [viteBin, "--config", "vite.config.ts", "--host", "0.0.0.0"],
    {
      cwd: webDir,
      env: {
        ...process.env,
        PORT: process.env.PORT || "5173",
        BASE_PATH: process.env.BASE_PATH || "/",
      },
    },
  );
}

console.log("\nEcoSched local servers:");
if (!webOnly) console.log("  API:       http://localhost:5000/api/healthz");
if (!apiOnly) console.log("  Website:   http://localhost:5173/");
console.log("Press Ctrl+C to stop.\n");
