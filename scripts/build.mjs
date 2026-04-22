import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { build, watch } from "rolldown";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dist = resolve(root, "dist");
const isWatch = process.argv.includes("--watch");

const ENTRIES = {
  content: "src/content/index.ts",
  background: "src/background/index.ts",
  options: "src/options/options.ts",
  popup: "src/popup/popup.ts",
};

const STATIC_COPIES = [
  ["public/manifest.json", "dist/manifest.json"],
  ["public/icons", "dist/icons"],
  ["src/options/options.html", "dist/options.html"],
  ["src/options/options.css", "dist/options.css"],
  ["src/popup/popup.html", "dist/popup.html"],
  ["src/popup/popup.css", "dist/popup.css"],
];

async function copyStatics() {
  for (const [from, to] of STATIC_COPIES) {
    const src = resolve(root, from);
    const dst = resolve(root, to);
    if (!existsSync(src)) continue;
    await mkdir(dirname(dst), { recursive: true });
    await cp(src, dst, { recursive: true });
  }
}

const BUNDLE_CONFIG = {
  input: Object.fromEntries(
    Object.entries(ENTRIES).map(([name, path]) => [name, resolve(root, path)]),
  ),
  platform: "browser",
  output: {
    dir: dist,
    format: "esm",
    sourcemap: true,
    entryFileNames: "[name].js",
    chunkFileNames: "chunks/[name]-[hash].js",
  },
};

async function buildOnce() {
  if (existsSync(dist)) await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await build(BUNDLE_CONFIG);
  await copyStatics();
  console.log("build complete → dist/");
}

async function buildWatch() {
  const watcher = watch(BUNDLE_CONFIG);
  watcher.on("event", async (event) => {
    if (event.code === "BUNDLE_END") {
      await copyStatics();
      console.log(new Date().toISOString(), "watch rebuild ok");
    } else if (event.code === "ERROR") {
      console.error("watch rebuild error:", event.error);
    }
  });
  console.log("watching...");
}

if (isWatch) await buildWatch();
else await buildOnce();
