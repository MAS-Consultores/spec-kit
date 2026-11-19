import { readFileSync } from "node:fs";
import { join } from "node:path";

const snippets = ["panel-card", "section-label", "<h5", "text-muted", "<hr", "my-4", "badge", "switch"];
const properties = [
  "border",
  "border-radius",
  "box-shadow",
  "padding",
  "font-family",
  "font-size",
  "font-weight",
  "color",
  "background",
];

function problems(dir) {
  const component = readFileSync(join(dir, "component.tsx"), "utf8");
  const map = JSON.parse(readFileSync(join(dir, "fidelity-map.json"), "utf8"));
  const found = [];
  for (const snippet of snippets) {
    if (!component.includes(snippet)) found.push(`missing structure ${snippet}`);
  }
  if (/#[0-9a-fA-F]{3,8}\b/.test(component)) found.push("literal color");
  const declared = new Set((map.pairs ?? []).flatMap((pair) => pair.properties ?? []));
  for (const property of properties) {
    if (!declared.has(property)) found.push(`fidelity-map missing ${property}`);
  }
  return found;
}

const root = new URL("./settings-card-fixtures/", import.meta.url).pathname;
const cases = [
  { dir: "pass", ok: true },
  { dir: "missing-hr", ok: false, includes: "missing structure <hr" },
  { dir: "map-gap", ok: false, includes: "fidelity-map missing box-shadow" },
  { dir: "literal-color", ok: false, includes: "literal color" },
];

let failed = false;
for (const item of cases) {
  const found = problems(join(root, item.dir));
  if (item.ok && found.length > 0) {
    failed = true;
    console.error(`settings-card fixture ${item.dir} should pass: ${found.join(", ")}`);
  } else if (!item.ok && !found.some((line) => line.includes(item.includes))) {
    failed = true;
    console.error(`settings-card fixture ${item.dir} missed ${item.includes}: ${found.join(", ")}`);
  } else {
    console.log(`settings-card fixture ok ${item.dir}`);
  }
}
if (failed) process.exit(1);
console.log("settings-card ok");
