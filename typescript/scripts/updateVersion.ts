import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const versionFilePath = join(import.meta.dirname, "../src/version.ts");
const packageJsonPath = join(import.meta.dirname, "../src/package.json");

const packageJson = await readFile(packageJsonPath, "utf-8");
const packageVersion = JSON.parse(packageJson).version;

await writeFile(versionFilePath, `export const version = "${packageVersion}";\n`);
