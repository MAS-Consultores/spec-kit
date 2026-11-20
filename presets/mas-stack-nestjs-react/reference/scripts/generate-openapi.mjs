import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const target = join(root, "apps/api/openapi.json");
const client = join(root, "packages/contracts/src/client.ts");
const build = spawnSync("pnpm", ["--filter", "@demo/contracts", "exec", "tsc", "-p", "tsconfig.json"], {
  cwd: root,
  stdio: "inherit",
});
if (build.status !== 0) process.exit(build.status ?? 1);
const contracts = await import(join(root, "packages/contracts/dist/index.js"));
const document = JSON.stringify(contracts.openApiDocument, null, 2) + "\n";
const clientSource = `export const paths = ${JSON.stringify(Object.keys(contracts.openApiDocument.paths))} as const;\n`;
const check = process.argv.includes("--check");
if (check) {
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  const currentClient = existsSync(client) ? readFileSync(client, "utf8") : "";
  if (current !== document || currentClient !== clientSource) {
    console.error("ERROR: OpenAPI or api-client drift. Run node scripts/generate-openapi.mjs and commit the result.");
    process.exit(1);
  }
  console.log("openapi:check ok");
} else {
  writeFileSync(target, document);
  writeFileSync(client, clientSource);
  console.log("wrote openapi and client");
}
