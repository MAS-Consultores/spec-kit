import { readFile } from "xlsx";
import { read } from "xlsx/xlsx";

declare function require(id: string): { readFile: (name: string) => unknown };

export function fromPackage(name: string): unknown {
  return readFile(name) ?? read(name);
}

export function fromRequire(name: string): unknown {
  return require("xlsx/dist/xlsx.js").readFile(name);
}
