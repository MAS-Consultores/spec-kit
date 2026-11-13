import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
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
