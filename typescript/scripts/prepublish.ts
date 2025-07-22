import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Get the directory of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

const packageJsonPath = join(__dirname, "../src/package.json");

// Read package.json
const packageJsonContent = await readFile(packageJsonPath, "utf-8");
const packageJson = JSON.parse(packageJsonContent);

/*
 * NOTE: We explicitly don't want to publish the type field.
 * We create a separate package.json for `dist/cjs` and `dist/esm` that has the type field.
 */
delete packageJson.type;

// Write the modified package.json back to file
await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
