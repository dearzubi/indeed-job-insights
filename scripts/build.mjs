import { existsSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build, watch } from "rolldown";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dist = resolve(root, "dist");
const isWatch = process.argv.includes("--watch");

const ENTRIES = [
  { name: "content", input: "src/content/index.ts" },
  { name: "background", input: "src/background/index.ts" },
  { name: "options", input: "src/options/options.ts" },
  { name: "popup", input: "src/popup/popup.ts" },
];

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

function configFor(entry) {
  return {
    input: resolve(root, entry.input),
    platform: "browser",
    output: {
      file: resolve(dist, `${entry.name}.js`),
      format: "esm",
      sourcemap: true,
      codeSplitting: false,
    },
  };
}

async function buildOnce() {
  if (existsSync(dist)) await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  for (const entry of ENTRIES) {
    await build(configFor(entry));
  }
  await copyStatics();
  console.log("build complete → dist/");
}

async function buildWatch() {
  const watchers = ENTRIES.map((entry) => watch(configFor(entry)));
  let pending = watchers.length;
  for (const watcher of watchers) {
    watcher.on("event", async (event) => {
      if (event.code === "BUNDLE_END") {
        pending = Math.max(0, pending - 1);
        if (pending === 0) {
          await copyStatics();
          console.log(new Date().toISOString(), "watch rebuild ok");
          pending = watchers.length;
        }
      } else if (event.code === "ERROR") {
        console.error("watch rebuild error:", event.error);
      }
    });
  }
  console.log("watching...");
}

if (isWatch) await buildWatch();
else await buildOnce();
