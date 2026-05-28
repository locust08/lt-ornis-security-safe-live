import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const includeDeps = args.has("--deps");
const includeOutput = args.has("--output");

const packagePath = path.join(root, "package.json");
if (!fs.existsSync(packagePath)) {
  console.error("Refusing to clean: package.json was not found in the current directory.");
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
if (!packageJson.dependencies?.astro) {
  console.error("Refusing to clean: this does not look like the Ornis Astro project.");
  process.exit(1);
}

const targets = [
  ".astro",
  ".wrangler",
  ".playwright-mcp",
  "dist",
  "tmp",
];

if (includeOutput) {
  targets.push("output");
}

if (includeDeps) {
  targets.push("node_modules");
}

const rootFiles = fs.readdirSync(root, { withFileTypes: true });
for (const entry of rootFiles) {
  if (entry.isFile() && /^astro-dev.*\.log$/i.test(entry.name)) {
    targets.push(entry.name);
  }
}

const uniqueTargets = [...new Set(targets)];

function insideRoot(candidate) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(root, candidate);
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(resolvedRoot + path.sep);
}

function sizeOf(targetPath) {
  if (!fs.existsSync(targetPath)) return 0;

  const stat = fs.lstatSync(targetPath);
  if (stat.isSymbolicLink()) return 0;
  if (stat.isFile()) return stat.size;
  if (!stat.isDirectory()) return 0;

  let total = 0;
  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    total += sizeOf(path.join(targetPath, entry.name));
  }
  return total;
}

function formatSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

let removedBytes = 0;
let removedCount = 0;

for (const target of uniqueTargets) {
  if (!insideRoot(target)) {
    console.warn(`Skipped unsafe path: ${target}`);
    continue;
  }

  const absoluteTarget = path.resolve(root, target);
  if (!fs.existsSync(absoluteTarget)) continue;

  const bytes = sizeOf(absoluteTarget);
  removedBytes += bytes;
  removedCount += 1;

  const action = dryRun ? "Would remove" : "Removing";
  console.log(`${action}: ${target} (${formatSize(bytes)})`);

  if (!dryRun) {
    fs.rmSync(absoluteTarget, { recursive: true, force: true, maxRetries: 3 });
  }
}

if (removedCount === 0) {
  console.log("Nothing to clean.");
} else {
  const verb = dryRun ? "Would free" : "Freed";
  console.log(`${verb}: ${formatSize(removedBytes)} across ${removedCount} item(s).`);
}

if (includeDeps && !dryRun) {
  console.log("node_modules was removed. Run npm ci before npm run build.");
}
