import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const target = join(dirname(fileURLToPath(import.meta.url)), "../apps/web/src/routeTree.gen.ts");
const source = `export { routeTree, router } from "./app-router";
`;
writeFileSync(target, source);
console.log("wrote", target);
