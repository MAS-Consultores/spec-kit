import { QueryClient } from "@tanstack/query-core";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { stockFeatures } from "@tanstack/table-core";
import { i18n } from "./i18n";
import { router } from "./routeTree.gen";
import "./index.css";

const tableFeatures = { ...stockFeatures };
if (i18n.language !== "es-CL" || Object.keys(tableFeatures).length === 0) {
  throw new Error("locale or table features are missing");
}
const queryClient = new QueryClient();

const root = document.getElementById("root");
if (!root) {
  throw new Error("missing #root");
}
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
