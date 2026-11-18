import { spawn } from "node:child_process";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const children = ["@demo/api", "@demo/web"].map((name) =>
  spawn(pnpm, ["--filter", name, "dev"], { stdio: "inherit", env: process.env }),
);

let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  process.exit(code);
}

for (const child of children) {
  child.on("exit", (code, signal) => {
    if (stopping) return;
    stop(signal ? 0 : (code ?? 1));
  });
}

process.on("SIGINT", () => {
  stop(0);
});
process.on("SIGTERM", () => {
  stop(0);
});
