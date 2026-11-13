import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const target = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/web/src/routeTree.gen.ts",
);
const source = `import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { Home } from "./routes/index";

const rootRoute = createRootRoute({
  component: Home,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

export const routeTree = rootRoute.addChildren([indexRoute]);
export const router = createRouter({ routeTree });
`;
writeFileSync(target, source);
console.log("wrote", target);
