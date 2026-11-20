import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const skeleton = process.argv[2];
if (!skeleton) {
  console.error("usage: node scripts/compile-preset-snippets.mjs <skeleton-with-node_modules>");
  process.exit(1);
}
const files = [
  "presets/mas-stack-nestjs-react/templates/constitution-template-append.md",
  "presets/mas-stack-nestjs-react/commands/speckit.plan.md",
  "presets/mas-stack-nestjs-react/commands/speckit.tasks.md",
  "presets/mas-stack-nestjs-react/commands/speckit.implement.md",
  "presets/mas-stack-nestjs-react/commands/speckit.analyze.md",
];
const snippets = [];
for (const file of files) {
  const text = readFileSync(join(repo, file), "utf8");
  for (const match of text.matchAll(/```typescript\n([\s\S]*?)```/g)) {
    snippets.push({ file, code: match[1] });
  }
}
if (snippets.length === 0) {
  console.error("ERROR: no typescript snippets to compile");
  process.exit(1);
}
function writeProject(dir, items) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
          noEmit: true,
          skipLibCheck: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          typeRoots: ["../node_modules/@types"],
          types: ["node"],
        },
        include: ["*.ts"],
      },
      null,
      2,
    ),
  );
  items.forEach((snippet, index) => {
    writeFileSync(join(dir, `snippet-${String(index)}.ts`), snippet.code ?? "");
  });
}

const apiSnippets = snippets.filter((snippet) => !snippet.code.includes("@tanstack/"));
const webSnippets = snippets.filter((snippet) => snippet.code.includes("@tanstack/"));
writeProject(join(skeleton, "apps/api/.snippet-check"), apiSnippets);
writeProject(join(skeleton, "apps/web/.snippet-check"), webSnippets);
for (const project of ["apps/api", "apps/web"]) {
  const tsc = spawnSync("pnpm", ["exec", "tsc", "-p", ".snippet-check"], {
    cwd: join(skeleton, project),
    stdio: "inherit",
  });
  if (tsc.status !== 0) {
    console.error("ERROR: a constitution or skill snippet failed to compile");
    process.exit(tsc.status ?? 1);
  }
}
console.log(`compiled ${String(snippets.length)} snippets`);
