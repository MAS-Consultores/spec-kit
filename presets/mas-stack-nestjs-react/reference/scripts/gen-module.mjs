/**
 * Scaffold one domain. Registration touches only:
 * apps/api/src/app.module.ts, apps/web/src/feature-routes.ts, eslint/model-ownership.js.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const name = process.argv[2] ?? "";
if (!/^[a-z][a-z0-9]*$/.test(name)) {
  console.error("usage: pnpm gen:module <domain>  (single lowercase word)");
  process.exit(1);
}
const reserved = new Set(["auth", "audit", "health", "mcp", "prisma", "throttle", "config", "home"]);
if (reserved.has(name)) {
  console.error(`domain ${name} already exists`);
  process.exit(1);
}

const pascal = name.charAt(0).toUpperCase() + name.slice(1);
const plural = `${name}s`;
const className = `${pascal}Module`;

const moduleDir = join(root, "apps/api/src/modules", name);
const featureDir = join(root, "apps/web/src/features", name);
const contractDir = join(root, "packages/contracts/src", name);
mkdirSync(join(featureDir, "components"), { recursive: true });
mkdirSync(join(featureDir, "api"), { recursive: true });
mkdirSync(moduleDir, { recursive: true });
mkdirSync(contractDir, { recursive: true });

writeFileSync(
  join(root, "apps/api/prisma/schema", `${name}.prisma`),
  `model ${pascal} {\n  id String @id @default(uuid())\n\n  @@map("${plural}")\n}\n`,
);

writeFileSync(
  join(contractDir, "index.ts"),
  `import { z } from "zod";\n\nexport const ${name}Schema = z.object({ id: z.uuid() }).strict();\nexport type ${pascal} = z.infer<typeof ${name}Schema>;\n`,
);

writeFileSync(
  join(moduleDir, `${name}.repository.ts`),
  `import { Injectable } from "@nestjs/common";\nimport { PrismaService } from "../prisma/index.js";\n\n@Injectable()\nexport class ${pascal}Repository {\n  constructor(private readonly prisma: PrismaService) {}\n\n  findAll(): Promise<{ id: string }[]> {\n    return this.prisma.${name}.findMany({ select: { id: true } });\n  }\n}\n`,
);

writeFileSync(
  join(moduleDir, `${name}.service.ts`),
  `import { Injectable } from "@nestjs/common";\nimport { ${pascal}Repository } from "./${name}.repository.js";\n\n@Injectable()\nexport class ${pascal}Service {\n  constructor(private readonly records: ${pascal}Repository) {}\n\n  list(): Promise<{ id: string }[]> {\n    return this.records.findAll();\n  }\n}\n`,
);

writeFileSync(
  join(moduleDir, `${name}.controller.ts`),
  `import { Controller, Get } from "@nestjs/common";\nimport { Authenticated } from "../auth/index.js";\nimport { ${pascal}Service } from "./${name}.service.js";\n\n@Controller("${plural}")\nexport class ${pascal}Controller {\n  constructor(private readonly records: ${pascal}Service) {}\n\n  @Authenticated()\n  @Get()\n  list(): Promise<{ id: string }[]> {\n    return this.records.list();\n  }\n}\n`,
);

writeFileSync(
  join(moduleDir, `${name}.module.ts`),
  `import { Module } from "@nestjs/common";\nimport { PrismaModule } from "../prisma/index.js";\nimport { ${pascal}Controller } from "./${name}.controller.js";\nimport { ${pascal}Repository } from "./${name}.repository.js";\nimport { ${pascal}Service } from "./${name}.service.js";\n\n@Module({\n  imports: [PrismaModule],\n  controllers: [${pascal}Controller],\n  providers: [${pascal}Repository, ${pascal}Service],\n  exports: [${pascal}Service],\n})\nexport class ${className} {\n  readonly label = "${name}";\n}\n`,
);

writeFileSync(
  join(moduleDir, "index.ts"),
  `export { ${className} } from "./${name}.module.js";\nexport { ${pascal}Service } from "./${name}.service.js";\n`,
);

writeFileSync(
  join(featureDir, "api", `${name}-api.ts`),
  `export async function load${pascal}s(input: RequestInfo): Promise<unknown> {\n  const response = await fetch(input);\n  return response.json() as Promise<unknown>;\n}\n`,
);

writeFileSync(
  join(featureDir, "components", `${name}-page.tsx`),
  `import type { ReactElement } from "react";\nimport { useTranslation } from "react-i18next";\n\nexport function ${pascal}Page(): ReactElement {\n  const { t } = useTranslation();\n  return (\n    <main>\n      <h1>{t("title")}</h1>\n    </main>\n  );\n}\n\nexport default ${pascal}Page;\n`,
);

writeFileSync(
  join(featureDir, "index.ts"),
  `export { ${pascal}Page as default, ${pascal}Page } from "./components/${name}-page";\n`,
);

const ownership = join(root, "eslint/model-ownership.js");
const ownershipText = readFileSync(ownership, "utf8");
if (!ownershipText.includes(`${name}:`)) {
  writeFileSync(ownership, ownershipText.replace("};\n", `  ${name}: ["${name}"],\n};\n`));
}

const appModule = join(root, "apps/api/src/app.module.ts");
let appText = readFileSync(appModule, "utf8");
const importLine = `import { ${className} } from "./modules/${name}/index.js";\n`;
if (!appText.includes(importLine)) {
  appText = importLine + appText;
  appText = appText.replace("imports: [", `imports: [${className}, `);
  writeFileSync(appModule, appText);
}

const routes = join(root, "apps/web/src/feature-routes.ts");
let routeText = readFileSync(routes, "utf8");
const routeLine = `  {\n    to: "/${plural}",\n    labelKey: "title",\n    load: () => import("./features/${name}/index"),\n  },\n`;
if (!routeText.includes(`features/${name}/index.ts`)) {
  routeText = routeText.replace("] as const;\n", `${routeLine}] as const;\n`);
  writeFileSync(routes, routeText);
}

console.log(`generated ${name}`);
