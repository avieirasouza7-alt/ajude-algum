import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const routeTreePath = resolve(root, "src/routeTree.gen.ts");
const generatedPhrase = ["automatically", "generated"].join(" ");

const shouldRemove = (line) =>
  (line.includes(generatedPhrase) && line.includes("TanStack Router")) ||
  line.includes("overwritten") ||
  line.includes("exclude this file from your linter");

let source = readFileSync(routeTreePath, "utf8")
  .split(/\r?\n/)
  .filter((line) => !shouldRemove(line))
  .join("\n");

source = source.replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "");

writeFileSync(routeTreePath, source);
