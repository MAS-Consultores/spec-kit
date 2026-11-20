import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../apps/api/prisma/schema");
const files = readdirSync(dir).filter((name) => name.endsWith(".prisma"));
if (!files.includes("base.prisma")) {
  console.error("prisma/schema/base.prisma is required");
  process.exit(1);
}
const base = readFileSync(join(dir, "base.prisma"), "utf8");
if (!base.includes("importFileExtension") || base.includes("model ")) {
  console.error("base.prisma must hold the generator only");
  process.exit(1);
}
const domainFiles = files.filter((name) => name !== "base.prisma");
if (domainFiles.length < 2) {
  console.error("expected one .prisma file per domain");
  process.exit(1);
}
for (const name of domainFiles) {
  const text = readFileSync(join(dir, name), "utf8");
  if (!text.includes("model ") || !text.includes("@@map(")) {
    console.error(`${name} must declare a model and @@map`);
    process.exit(1);
  }
  if (text.includes("generator ") || text.includes("datasource ")) {
    console.error(`${name} must not repeat generator or datasource`);
    process.exit(1);
  }
}
console.log("prisma layout ok");
