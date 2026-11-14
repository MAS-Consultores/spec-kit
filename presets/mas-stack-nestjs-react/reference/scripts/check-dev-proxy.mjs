/**
 * The browser talks to the API through the Vite /api proxy (dev and preview)
 * so cookies and CSRF stay on the web origin.
 */
import { readFileSync } from "node:fs";

const vite = readFileSync("apps/web/vite.config.ts", "utf8");
const playwright = readFileSync("apps/web/playwright.config.ts", "utf8");
const spec = readFileSync("apps/web/e2e/proxy.spec.ts", "utf8");
const main = readFileSync("apps/api/src/main.ts", "utf8");

const failures = [];
if (!vite.includes('"/api"') || !vite.includes("server:") || !vite.includes("preview:")) {
  failures.push("vite.config.ts must proxy /api in server and preview");
}
if (!vite.includes('process.env["API_PROXY_TARGET"]')) {
  failures.push("vite proxy target must be API_PROXY_TARGET");
}
if (!playwright.includes("baseURL") || !playwright.includes("webPort")) {
  failures.push("playwright baseURL must be the web origin");
}
if (!playwright.includes("API_PROXY_TARGET")) {
  failures.push("playwright preview must receive API_PROXY_TARGET");
}
if (!spec.includes('page.request.get("/api/v1/health")')) {
  failures.push("playwright must call /api through the web origin");
}
if (!main.includes("enableCors") || !main.includes("credentials: true") || !main.includes('process.env["CORS_ORIGIN"]')) {
  failures.push("CORS must be explicit, credentialed, and off unless CORS_ORIGIN is set");
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
console.log("dev-proxy ok");
