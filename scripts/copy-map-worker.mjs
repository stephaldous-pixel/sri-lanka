// MapLibre 6 runs its tile work in a separate worker file that bundlers don't
// pick up, so copy it into /public before every build (it stays in step with
// the installed version). The map points at it with setWorkerUrl().
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const source = path.join(path.dirname(require.resolve("maplibre-gl/package.json")), "dist", "maplibre-gl-worker.mjs");
const target = path.join(process.cwd(), "public", "vendor", "maplibre-gl-worker.mjs");
mkdirSync(path.dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`✓ Copied MapLibre worker to ${path.relative(process.cwd(), target)}`);
