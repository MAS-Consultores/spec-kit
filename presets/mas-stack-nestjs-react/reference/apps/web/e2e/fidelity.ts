/**
 * Compares a static HTML prototype with the app using getComputedStyle.
 * Screenshot, video, and trace are not used.
 */
/* eslint-disable max-lines -- fidelity gate stays one script so the comparison, server, and CLI share one review */

import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { extname, join, normalize, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Page } from "@playwright/test";

interface Viewport {
  width: number;
  height: number;
}

interface Pair {
  prototype: string;
  app: string;
  properties?: string[];
  viewport?: Viewport;
  kind?: "style" | "logo";
  states?: Array<"rest" | "hover" | "active">;
  icon?: boolean;
}

interface FidelityMap {
  prototype?: string;
  app?: string;
  tolerances?: Partial<Tolerances>;
  fonts?: string[];
  pairs: Pair[];
}

interface Tolerances {
  lengthPx: number;
  durationMs: number;
  colorChannel: number;
}

interface Measured {
  missing: boolean;
  tag: string;
  image: boolean;
  naturalWidth: number;
  naturalHeight: number;
  styles: Record<string, string>;
  fonts: Record<string, boolean>;
  icon: string;
}

interface StateVisual {
  color: string;
  backgroundColor: string;
  fontFamily: string;
  icon: string;
}

interface ServeHandle {
  url: string;
  close: () => Promise<void>;
}

const DEFAULT_TOLERANCES: Tolerances = { lengthPx: 0, durationMs: 0, colorChannel: 1 };

const DEFAULT_PROPERTIES = [
  "color",
  "background",
  "font-family",
  "font-size",
  "font-weight",
  "padding",
  "width",
  "height",
  "border-radius",
  "box-shadow",
  "animation-name",
  "animation-duration",
  "transition",
] as const;

const CSS_PROPS: Record<string, readonly string[]> = {
  color: ["color"],
  background: ["background-color", "background-image"],
  "background-color": ["background-color"],
  "background-image": ["background-image"],
  "font-family": ["font-family"],
  "font-size": ["font-size"],
  "font-weight": ["font-weight"],
  padding: ["padding"],
  width: ["width"],
  height: ["height"],
  "border-radius": ["border-radius"],
  "box-shadow": ["box-shadow"],
  "animation-name": ["animation-name"],
  "animation-duration": ["animation-duration"],
  transition: ["transition-property", "transition-duration", "transition-timing-function"],
};

const LENGTH_PROPS = ["padding", "width", "height", "font-size", "border-radius"] as const;
const DURATION_PROPS = ["animation-duration", "transition-duration"] as const;
const COLOR_PROPS = ["color", "background-color"] as const;

function workspaceRoot(start: string): string {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) return undefined;
  return value;
}

function labelOf(selector: string): string {
  const matched = /data-testid\s*=\s*["']?([^"'\]]+)/.exec(selector);
  return matched?.[1] ?? selector;
}

function clampByte(channel: number): number {
  return Math.max(0, Math.min(255, Math.round(channel)));
}

function srgbByte(linear: number): number {
  const value = linear <= 0.0031308 ? 12.92 * linear : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
  return clampByte(value * 255);
}

function oklchToRgb(lightness: number, chroma: number, hueDeg: number): [number, number, number] {
  const hue = (hueDeg * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const lmsL = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const lmsM = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const lmsS = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lmsL ** 3;
  const m = lmsM ** 3;
  const s = lmsS ** 3;
  return [
    srgbByte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    srgbByte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    srgbByte(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function hexToRgb(hex: string): [number, number, number] | undefined {
  const body = hex.slice(1);
  const expanded = body.length === 3 ? body.split("").map((part) => part + part).join("") : body.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return undefined;
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

function canonicalColor(input: string): string | undefined {
  const value = input.trim().toLowerCase();
  if (value.startsWith("#")) {
    const rgb = hexToRgb(value);
    return rgb ? `rgb(${String(rgb[0])}, ${String(rgb[1])}, ${String(rgb[2])})` : undefined;
  }
  const oklch = /^oklch\(\s*([0-9.]+)%?\s+([0-9.]+)\s+([0-9.]+)/.exec(value);
  if (oklch) {
    const lightness = Number(oklch[1]);
    const scaled = value.includes("%") || lightness > 1 ? lightness / 100 : lightness;
    const rgb = oklchToRgb(scaled, Number(oklch[2]), Number(oklch[3]));
    return `rgb(${String(rgb[0])}, ${String(rgb[1])}, ${String(rgb[2])})`;
  }
  const rgb = /^rgba?\(\s*([0-9.]+)[,\s]+([0-9.]+)[,\s]+([0-9.]+)/.exec(value);
  if (!rgb) return undefined;
  return `rgb(${String(clampByte(Number(rgb[1])))}, ${String(clampByte(Number(rgb[2])))}, ${String(clampByte(Number(rgb[3])))})`;
}

function normalizeColors(value: string): string {
  return value.replace(/oklch\([^)]*\)|rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}/g, (part) => canonicalColor(part) ?? part);
}

function fontWeight(value: string): string {
  const named: Record<string, string> = { normal: "400", bold: "700" };
  return named[value.trim().toLowerCase()] ?? value.trim();
}

function fontFamily(value: string): string {
  return value.toLowerCase().replace(/["']/g, "").replace(/\s+/g, " ").trim();
}

function lengthNumbers(value: string): number[] | undefined {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 0) return undefined;
  const numbers: number[] = [];
  for (const part of parts) {
    const matched = /^(-?[0-9.]+)px$/.exec(part);
    if (!matched) return undefined;
    numbers.push(Number(matched[1]));
  }
  return numbers;
}

function durationMs(value: string): number[] | undefined {
  const matches = value.match(/-?[0-9.]+m?s/g);
  if (!matches || matches.length === 0) return undefined;
  return matches.map((part) => (part.endsWith("ms") ? Number(part.slice(0, -2)) : Number(part.slice(0, -1)) * 1000));
}

function sameNumbers(left: number[], right: number[], tolerance: number): boolean {
  if (left.length !== right.length) return false;
  return left.every((item, index) => Math.abs(item - (right[index] ?? 0)) <= tolerance);
}

function named(group: readonly string[], property: string): boolean {
  for (const item of group) {
    if (item === property) return true;
  }
  return false;
}

function equivalent(property: string, prototype: string, app: string, tolerances: Tolerances): boolean {
  if (named(COLOR_PROPS, property)) {
    const left = canonicalColor(prototype);
    const right = canonicalColor(app);
    if (left && right) {
      const leftRgb = left.match(/[0-9]+/g)?.map(Number) ?? [];
      const rightRgb = right.match(/[0-9]+/g)?.map(Number) ?? [];
      return sameNumbers(leftRgb, rightRgb, tolerances.colorChannel);
    }
  }
  if (named(LENGTH_PROPS, property)) {
    const left = lengthNumbers(prototype);
    const right = lengthNumbers(app);
    if (left && right) return sameNumbers(left, right, tolerances.lengthPx);
  }
  if (named(DURATION_PROPS, property)) {
    const left = durationMs(prototype);
    const right = durationMs(app);
    if (left && right) return sameNumbers(left, right, tolerances.durationMs);
  }
  if (property === "font-weight") return fontWeight(prototype) === fontWeight(app);
  if (property === "font-family") return fontFamily(prototype) === fontFamily(app);
  if (property === "box-shadow" || property === "background-image") {
    return normalizeColors(prototype).replace(/\s+/g, " ") === normalizeColors(app).replace(/\s+/g, " ");
  }
  return prototype.replace(/\s+/g, " ").trim() === app.replace(/\s+/g, " ").trim();
}

function cssFiles(dir: string): string[] {
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith(".css")) found.push(path);
    }
  };
  walk(dir);
  return found;
}

function motionGuard(prototypeDir: string, appDir: string | undefined): string | undefined {
  const prototypeCss = cssFiles(prototypeDir).map((path) => readFileSync(path, "utf8")).join("\n");
  if (!prototypeCss.includes("@keyframes")) return undefined;
  if (!prototypeCss.includes("prefers-reduced-motion")) {
    return "el prototipo define @keyframes sin prefers-reduced-motion";
  }
  if (appDir === undefined) return undefined;
  const appCss = cssFiles(appDir).map((path) => readFileSync(path, "utf8")).join("\n");
  if (!appCss.includes("prefers-reduced-motion")) {
    return "la app omite prefers-reduced-motion y el prototipo define @keyframes";
  }
  return undefined;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".png": "image/png",
};

function serve(root: string): Promise<ServeHandle> {
  const rootResolved = resolve(root);
  const server: Server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const requested = decodeURIComponent(url.pathname);
    const relativePath = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
    const file = normalize(join(rootResolved, relativePath));
    const fromRoot = relative(rootResolved, file);
    if (fromRoot.startsWith("..") || !existsSync(file) || statSync(file).isDirectory()) {
      response.writeHead(404);
      response.end("not found");
      return;
    }
    response.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("static server has no port"));
        return;
      }
      resolveListen({
        url: `http://127.0.0.1:${String(address.port)}/`,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((error) => {
              if (error) closeReject(error);
              else closeResolve();
            });
          }),
      });
    });
  });
}

async function measure(page: Page, selector: string, properties: readonly string[], fonts: readonly string[]): Promise<Measured> {
  return page.evaluate(
    async ({ selector: target, properties: names, fonts: checks }) => {
      const element = document.querySelector(target);
      const fontResults: Record<string, boolean> = {};
      await document.fonts.ready;
      for (const check of checks) fontResults[check] = document.fonts.check(check);
      if (!element) {
        return {
          missing: true,
          tag: "",
          image: false,
          naturalWidth: 0,
          naturalHeight: 0,
          styles: {},
          fonts: fontResults,
          icon: "",
        };
      }
      const image = element instanceof HTMLImageElement ? element : element.querySelector("img");
      if (image instanceof HTMLImageElement) {
        try {
          await image.decode();
        } catch {
          /* naturalWidth stays 0 and the comparison reports it */
        }
      }
      const computed = getComputedStyle(element);
      const styles: Record<string, string> = {};
      for (const name of names) styles[name] = computed.getPropertyValue(name);
      const svg = element instanceof SVGElement ? element : null;
      return {
        missing: false,
        tag: element.tagName,
        image: image instanceof HTMLImageElement || svg !== null,
        naturalWidth: image instanceof HTMLImageElement ? image.naturalWidth : svg !== null ? svg.clientWidth : 0,
        naturalHeight: image instanceof HTMLImageElement ? image.naturalHeight : svg !== null ? svg.clientHeight : 0,
        styles,
        fonts: fontResults,
        icon: "",
      };
    },
    { selector, properties, fonts },
  );
}

function cssNames(properties: readonly string[]): string[] {
  const names: string[] = [];
  for (const property of properties) {
    for (const name of CSS_PROPS[property] ?? [property]) {
      if (!names.includes(name)) names.push(name);
    }
  }
  return names;
}

async function readState(page: Page, selector: string): Promise<StateVisual & { missing: boolean }> {
  return page.evaluate((target) => {
    const element = document.querySelector(target);
    if (!element) return { missing: true, color: "", backgroundColor: "", fontFamily: "", icon: "" };
    const computed = getComputedStyle(element);
    const classes = Array.from(element.classList);
    const faStyles = ["fa-solid", "fa-regular", "fa-brands", "fa-light", "fa-thin", "fa-duotone"];
    const faStyle = classes.find((name) => faStyles.includes(name));
    const glyph = classes.find((name) => name.startsWith("fa-") && !faStyles.includes(name) && name !== "fa");
    const text = element.textContent;
    const lucide = element.getAttribute("data-lucide");
    const dataIcon = element.getAttribute("data-icon");
    const material = classes.includes("material-symbols-outlined") || classes.includes("material-symbols");
    const icon =
      faStyle && glyph
        ? `fontawesome:${faStyle} ${glyph}`
        : material
          ? `material-symbols:${text.trim()}`
          : lucide !== null
            ? `lucide:${lucide}`
            : dataIcon === null
              ? ""
              : dataIcon;
    return {
      missing: false,
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontFamily: computed.fontFamily,
      icon,
    };
  }, selector);
}

async function readInteractive(page: Page, selector: string, states: readonly string[]): Promise<Record<string, StateVisual & { missing: boolean }>> {
  await page.mouse.move(0, 0);
  const rest = await readState(page, selector);
  const found: Record<string, StateVisual & { missing: boolean }> = { rest };
  if (states.includes("hover") || states.includes("active")) {
    await page.locator(selector).hover();
    if (states.includes("hover")) found["hover"] = await readState(page, selector);
    if (states.includes("active")) {
      await page.mouse.down();
      found["active"] = await readState(page, selector);
      await page.mouse.up();
    }
  }
  await page.mouse.move(0, 0);
  return found;
}

function visualValue(state: StateVisual, property: string): string {
  if (property === "color") return state.color;
  if (property === "background-color" || property === "background") return state.backgroundColor;
  if (property === "font-family") return state.fontFamily;
  return "";
}

function stateFailures(pair: Pair, prototype: Record<string, StateVisual & { missing: boolean }>, app: Record<string, StateVisual & { missing: boolean }>, tolerances: Tolerances): string[] {
  const label = labelOf(pair.app);
  const failures: string[] = [];
  const states = pair.states ?? [];
  const properties = (pair.properties ?? ["color", "background-color", "font-family"]).filter((property) =>
    property === "color" || property === "background" || property === "background-color" || property === "font-family",
  );
  for (const state of states) {
    const left = prototype[state];
    const right = app[state];
    if (!left || left.missing) {
      failures.push(`${label} no está en el prototipo (${pair.prototype})`);
      continue;
    }
    if (!right || right.missing) {
      failures.push(`${label} no está en la app (${pair.app})`);
      continue;
    }
    for (const property of properties) {
      const prototypeValue = visualValue(left, property);
      const appValue = visualValue(right, property);
      if (!equivalent(property === "background" ? "background-color" : property, prototypeValue, appValue, tolerances)) {
        const prefix = state === "rest" ? property : `${state} ${property}`;
        failures.push(`${label} ${prefix} ${appValue} vs prototipo ${prototypeValue}`);
      }
    }
  }
  if (pair.icon) {
    const prototypeIcon = prototype["rest"]?.icon ?? "";
    const appIcon = app["rest"]?.icon ?? "";
    if (prototypeIcon !== appIcon) {
      failures.push(`${label} icon ${appIcon || "ninguno"} vs prototipo ${prototypeIcon || "ninguno"}`);
    }
  }
  return failures;
}

function recordedLine(selector: string, visual: StateVisual & { missing: boolean }, state: string): string {
  return `recorded ${labelOf(selector)} ${state} icon ${visual.icon || "ninguno"} color ${visual.color} background ${visual.backgroundColor} font ${visual.fontFamily}`;
}

function rootCustomProperty(css: string, name: string): string {
  const root = /:root\s*\{([^}]*)\}/.exec(css);
  if (!root) return "";
  const matched = new RegExp(`--${name}\\s*:\\s*([^;]+)`).exec(root[1] ?? "");
  return matched?.[1]?.trim() ?? "";
}

export function rootVariableTrap(prototypeCss: string, mismatchCss: string): string | undefined {
  const prototypeRoot = rootCustomProperty(prototypeCss, "sidebar-accent-foreground");
  const mismatchRoot = rootCustomProperty(mismatchCss, "sidebar-accent-foreground");
  if (prototypeRoot === "" || prototypeRoot.toLowerCase() !== mismatchRoot.toLowerCase()) {
    return "el fixture ya no comparte --sidebar-accent-foreground en :root";
  }
  if (!prototypeCss.includes("#123456")) return "el prototipo ya no fija el color computado #123456";
  if (!mismatchCss.includes("var(--sidebar-accent-foreground)")) {
    return "el caso negativo ya no pinta con la variable de :root";
  }
  return undefined;
}

function comparePair(pair: Pair, prototype: Measured, app: Measured, tolerances: Tolerances): string[] {
  const label = labelOf(pair.app);
  if (prototype.missing) return [`${label} no está en el prototipo (${pair.prototype})`];
  if (app.missing) return [`${label} no está en la app (${pair.app})`];
  if (pair.kind === "logo") {
    if (!app.image) {
      return [`${label} es texto vs prototipo imagen ${String(prototype.naturalWidth)}x${String(prototype.naturalHeight)}`];
    }
    const failures: string[] = [];
    if (prototype.naturalWidth <= 0 || app.naturalWidth <= 0) {
      failures.push(`${label} naturalWidth ${String(app.naturalWidth)} vs prototipo ${String(prototype.naturalWidth)}`);
    } else if (prototype.naturalWidth !== app.naturalWidth) {
      failures.push(`${label} naturalWidth ${String(app.naturalWidth)} vs prototipo ${String(prototype.naturalWidth)}`);
    }
    if (prototype.naturalHeight !== app.naturalHeight) {
      failures.push(`${label} naturalHeight ${String(app.naturalHeight)} vs prototipo ${String(prototype.naturalHeight)}`);
    }
    return failures;
  }
  const failures: string[] = [];
  const requested = pair.properties ?? DEFAULT_PROPERTIES;
  for (const property of requested) {
    const parts = CSS_PROPS[property] ?? [property];
    const prototypeValue = parts.map((part) => prototype.styles[part] ?? "").join(" ").trim();
    const appValue = parts.map((part) => app.styles[part] ?? "").join(" ").trim();
    const matches = parts.every((part) => equivalent(part, prototype.styles[part] ?? "", app.styles[part] ?? "", tolerances));
    if (!matches) failures.push(`${label} ${property} ${appValue} vs prototipo ${prototypeValue}`);
  }
  return failures;
}

async function openPage(browser: Awaited<ReturnType<typeof chromium.launch>>, url: string): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "load" });
  return page;
}

export async function runFidelity(map: FidelityMap, prototypeDir: string, appTarget: string): Promise<string[]> {
  const tolerances = { ...DEFAULT_TOLERANCES, ...map.tolerances };
  const fonts = map.fonts ?? [];
  const failures: string[] = [];
  const appIsUrl = /^https?:\/\//.test(appTarget);
  const motion = motionGuard(prototypeDir, appIsUrl ? undefined : appTarget);
  if (motion) failures.push(motion);
  const prototypeServer = await serve(prototypeDir);
  const appServer = appIsUrl ? undefined : await serve(appTarget);
  const browser = await chromium.launch();
  try {
    const prototypePage = await openPage(browser, prototypeServer.url);
    const appPage = await openPage(browser, appServer?.url ?? appTarget);
    const fontProbe = map.pairs[0];
    if (fontProbe && fonts.length > 0) {
      const prototypeFonts = await measure(prototypePage, fontProbe.prototype, [], fonts);
      const appFonts = await measure(appPage, fontProbe.app, [], fonts);
      for (const check of fonts) {
        if (prototypeFonts.fonts[check] !== true) failures.push(`document.fonts.check(${check}) es false en el prototipo`);
        if (appFonts.fonts[check] !== true) failures.push(`document.fonts.check(${check}) es false en la app`);
      }
    }
    for (const pair of map.pairs) {
      const viewport = pair.viewport ?? { width: 1280, height: 800 };
      await prototypePage.setViewportSize(viewport);
      await appPage.setViewportSize(viewport);
      const interactive = (pair.states?.length ?? 0) > 0 || pair.icon === true;
      if (interactive) {
        const states = pair.states ?? ["rest"];
        const prototypeStates = await readInteractive(prototypePage, pair.prototype, states);
        const appStates = await readInteractive(appPage, pair.app, states);
        for (const state of states) {
          const visual = prototypeStates[state];
          if (visual && !visual.missing) console.log(recordedLine(pair.prototype, visual, state));
        }
        failures.push(...stateFailures(pair, prototypeStates, appStates, tolerances));
        continue;
      }
      const names = pair.kind === "logo" ? [] : cssNames(pair.properties ?? DEFAULT_PROPERTIES);
      const prototypeMeasured = await measure(prototypePage, pair.prototype, names, []);
      const appMeasured = await measure(appPage, pair.app, names, []);
      failures.push(...comparePair(pair, prototypeMeasured, appMeasured, tolerances));
    }
    await appPage.mouse.move(0, 0);
    const contrast = await new AxeBuilder({ page: appPage }).withRules(["color-contrast"]).analyze();
    for (const violation of [...contrast.violations, ...contrast.incomplete]) {
      failures.push(`axe color-contrast ${String(violation.nodes.length)}`);
    }
  } finally {
    await browser.close();
    await prototypeServer.close();
    if (appServer) await appServer.close();
  }
  return failures;
}

function findMaps(root: string): string[] {
  const specs = join(root, "specs");
  if (!existsSync(specs)) return [];
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name === "fidelity-map.json") found.push(path);
    }
  };
  walk(specs);
  return found;
}

function loadMap(path: string): FidelityMap {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof parsed !== "object" || parsed === null || !("pairs" in parsed) || !Array.isArray(parsed.pairs)) {
    throw new Error(`${path} must contain pairs`);
  }
  return parsed as FidelityMap;
}

async function runMapFile(mapPath: string, appOverride: string | undefined): Promise<number> {
  const map = loadMap(mapPath);
  const base = dirname(mapPath);
  const prototypeDir = resolve(base, readFlag("--prototype") ?? map.prototype ?? "");
  const appTarget = resolveTarget(base, appOverride ?? map.app);
  if (!existsSync(prototypeDir)) {
    console.error(`prototipo no encontrado: ${prototypeDir}`);
    return 1;
  }
  const failures = await runFidelity(map, prototypeDir, appTarget);
  if (failures.length === 0) {
    console.log(`fidelity ok ${mapPath}`);
    return 0;
  }
  for (const failure of failures) console.error(failure);
  return 1;
}

function resolveTarget(base: string, target: string | undefined): string {
  if (target === undefined || target === "") throw new Error("fidelity map needs app");
  if (/^https?:\/\//.test(target)) return target;
  return resolve(base, target);
}

function selfTest(): number {
  const prototypeCss = readFlag("--prototype-css");
  const mismatchCss = readFlag("--mismatch-css");
  if (!prototypeCss || !mismatchCss) {
    console.error("self-test needs --prototype-css and --mismatch-css");
    return 1;
  }
  const trap = rootVariableTrap(readFileSync(prototypeCss, "utf8"), readFileSync(mismatchCss, "utf8"));
  if (trap) {
    console.error(trap);
    return 1;
  }
  console.log("la variable de :root coincide y el color computado no");
  return 0;
}

async function main(): Promise<number> {
  if (process.argv.includes("--self-test")) return selfTest();
  const explicit = readFlag("--map");
  const appOverride = readFlag("--app");
  if (explicit) return runMapFile(resolve(explicit), appOverride);
  const maps = findMaps(workspaceRoot(process.cwd()));
  if (maps.length === 0) {
    console.log("no fidelity map; gate skipped");
    return 0;
  }
  let code = 0;
  for (const mapPath of maps) {
    const result = await runMapFile(mapPath, appOverride);
    if (result !== 0) code = result;
  }
  return code;
}

const entry = process.argv[1] ? fileURLToPath(import.meta.url) === resolve(process.argv[1]) : false;
if (entry) {
  main()
    .then((code) => {
      process.exit(code);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "fidelity failed");
      process.exit(1);
    });
}
