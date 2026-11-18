import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { lazy, Suspense, type ComponentType, type ReactElement } from "react";
import { featureRoutes } from "./feature-routes";
import { AppShell } from "./shell";

function ShellLayout(): ReactElement {
  return (
    <Suspense fallback={null}>
      <AppShell items={featureRoutes}>
        <Outlet />
      </AppShell>
    </Suspense>
  );
}

function lazyPage(load: () => Promise<{ default: ComponentType }>): () => ReactElement {
  const Page = lazy(load);
  return function Routed(): ReactElement {
    return <Page />;
  };
}

const rootRoute = createRootRoute({
  component: ShellLayout,
});

const childRoutes = featureRoutes.map((entry) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: entry.to,
    component: lazyPage(entry.load),
  }),
);

export const routeTree = rootRoute.addChildren(childRoutes);
export const router = createRouter({ routeTree });
