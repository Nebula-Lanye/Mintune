import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const appConfig = fs.readFileSync("app.config.ts", "utf8");
const mintuneData = fs.readFileSync("lib/mintune-data.ts", "utf8");
const tauriConfig = JSON.parse(
  fs.readFileSync("src-tauri/tauri.conf.json", "utf8"),
);
const cargo = fs.readFileSync("src-tauri/Cargo.toml", "utf8");

const appVersion = appConfig.match(/\bversion:\s*["']([^"']+)["']/)?.[1];
const dataVersion = mintuneData.match(
  /APP_VERSION\s*=\s*["']([^"']+)["']/,
)?.[1];
const cargoVersion = cargo.match(/^version\s*=\s*["']([^"']+)["']/m)?.[1];
const versions = {
  "package.json": packageJson.version,
  "app.config.ts": appVersion,
  "lib/mintune-data.ts": dataVersion,
  "src-tauri/tauri.conf.json": tauriConfig.version,
  "src-tauri/Cargo.toml": cargoVersion,
};
const unique = new Set(Object.values(versions));
if (unique.size !== 1 || [...unique][0] === undefined) {
  console.error("Version mismatch:");
  console.error(JSON.stringify(versions, null, 2));
  process.exit(1);
}
console.log(`Version sync OK: ${[...unique][0]}`);
