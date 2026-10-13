// Publishes public/kit/pixicons.js (run `npm run build:kit` first) as the `pixiconsio` npm package, so the kit is
// also served by jsDelivr, independently of the site. Does nothing when the kit is the same as the latest version.
// Pass --dry-run to only report what would be published, and --otp=123456 to publish with a 2FA code.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PKG = "packages/pixiconsio";
const kit = readFileSync("public/kit/pixicons.js");
const pkg = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8"));

// The next version: a patch after the latest one, unless package.json asks for a higher major or minor.
let version = pkg.version;
const res = await fetch(`https://registry.npmjs.org/${pkg.name}`);
if (!res.ok && res.status !== 404) throw new Error(`npm registry: HTTP ${res.status}`);
// Real releases only: npm's placeholder (`0.0.0-stage`, made when the package is set up before its first
// release) is a stub without the kit.
const parse = (v) => v.split(".").map(Number);
const releases = res.ok ? Object.values((await res.json()).versions ?? {}).filter((v) => !v.stub && !v.version.includes("-")) : [];
const latest = releases.sort((a, b) => {
  const [x, y] = [parse(a.version), parse(b.version)];
  return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
})[0];
if (latest) {
  const tarball = Buffer.from(await (await fetch(latest.dist.tarball)).arrayBuffer());
  const published = execFileSync("tar", ["-xzOf", "-", "package/pixicons.js"], { input: tarball });
  if (published.equals(kit)) {
    console.log(`${pkg.name}@${latest.version} is up to date`);
    process.exit(0);
  }
  const [major, minor, patch] = parse(latest.version);
  const [wantMajor, wantMinor] = parse(pkg.version);
  version =
    wantMajor > major || (wantMajor === major && wantMinor > minor) ? `${wantMajor}.${wantMinor}.0` : `${major}.${minor}.${patch + 1}`;
}

if (process.argv.includes("--dry-run")) {
  console.log(`would publish ${pkg.name}@${version}`);
  process.exit(0);
}

// Publish from a scratch copy so the repo's package.json keeps its version.
const dir = mkdtempSync(join(tmpdir(), "pixiconsio-"));
writeFileSync(join(dir, "package.json"), JSON.stringify({ ...pkg, version }, null, 2) + "\n");
copyFileSync(join(PKG, "README.md"), join(dir, "README.md"));
copyFileSync(join(PKG, "LICENSE"), join(dir, "LICENSE"));
copyFileSync("public/kit/pixicons.js", join(dir, "pixicons.js"));
const otp = process.argv.find((a) => a.startsWith("--otp="));
execFileSync("npm", ["publish", "--access", "public", ...(otp ? [otp] : [])], { cwd: dir, stdio: "inherit" });
console.log(`published ${pkg.name}@${version}`);

// jsDelivr caches what `@1` points to for a while: ask it to pick up the new version now (best effort).
await new Promise((r) => setTimeout(r, 30_000));
const purge = await fetch(`https://purge.jsdelivr.net/npm/${pkg.name}@${version.split(".")[0]}/pixicons.js`).catch(() => null);
console.log(`jsDelivr purge: ${purge?.status ?? "failed"}`);
