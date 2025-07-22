import fs from "node:fs";
import path from "node:path";

const indexPath = path.join(process.cwd(), "src/openapi-client/generated/index.msw.ts");

if (fs.existsSync(indexPath)) {
  const content = fs.readFileSync(indexPath, "utf-8");
  const lines = content.split("\n").filter(line => line.trim());
  const sortedLines = lines.sort((a, b) => a.localeCompare(b));
  fs.writeFileSync(indexPath, sortedLines.join("\n") + "\n");
  console.log("✅ Sorted MSW index exports");
} else {
  console.log("MSW index file not found, skipping sort");
}
