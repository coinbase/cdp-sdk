#!/usr/bin/env node
/**
 * Regenerates the `<!-- docs-index:start --> ... <!-- docs-index:end -->` section
 * in a README.md from the Markdown files in a docs/ directory.
 *
 * Usage (run from the package directory that contains README.md and docs/):
 *   node <repo-root>/scripts/update-docs-index.mjs           # write
 *   node <repo-root>/scripts/update-docs-index.mjs --check   # CI check
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const README_PATH = "README.md";
const DOCS_DIR = "docs";
const START_MARKER = "<!-- docs-index:start -->";
const END_MARKER = "<!-- docs-index:end -->";

const PREFERRED_ORDER = [
  "quickstart-buyers.md",
  "quickstart-sellers.md",
  "env-setup.md",
  "route-config.md",
  "client-guardrails.md",
  "sdk-support.md",
];

function normalizeInline(text) {
  return text.replace(/\s+/g, " ").trim();
}

function stripMarkdown(text) {
  return text
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
}

function firstSentence(paragraph) {
  const clean = normalizeInline(stripMarkdown(paragraph));
  const match = clean.match(/^(.+?[.!?])(?:\s|$)/);
  return match ? match[1] : clean;
}

function extractTitle(contents, filename) {
  const heading = contents.match(/^#\s+(.+)$/m);
  if (!heading) {
    return filename.replace(/\.md$/, "");
  }
  return normalizeInline(stripMarkdown(heading[1]));
}

function extractDescription(contents) {
  const lines = contents.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith("# ")) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) {
    return "Documentation reference";
  }

  const paragraphLines = [];
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line === "") {
      if (paragraphLines.length > 0) {
        break;
      }
      continue;
    }
    if (line.startsWith("#")) {
      break;
    }
    paragraphLines.push(line);
  }

  if (paragraphLines.length === 0) {
    return "Documentation reference";
  }

  return firstSentence(paragraphLines.join(" "));
}

function compareDocNames(a, b) {
  const ia = PREFERRED_ORDER.indexOf(a);
  const ib = PREFERRED_ORDER.indexOf(b);
  if (ia !== -1 && ib !== -1) {
    return ia - ib;
  }
  if (ia !== -1) {
    return -1;
  }
  if (ib !== -1) {
    return 1;
  }
  return a.localeCompare(b);
}

async function buildDocsList() {
  const entries = await readdir(DOCS_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort(compareDocNames);

  const items = await Promise.all(
    files.map(async (filename) => {
      const filePath = path.join(DOCS_DIR, filename);
      const contents = await readFile(filePath, "utf8");
      const title = extractTitle(contents, filename);
      const description = extractDescription(contents);
      return `- [${title}](./${filePath}) - ${description}`;
    }),
  );

  return items.join("\n");
}

function replaceSection(readme, generatedList) {
  const start = readme.indexOf(START_MARKER);
  const end = readme.indexOf(END_MARKER);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `README is missing docs index markers: ${START_MARKER} ... ${END_MARKER}`,
    );
  }

  const before = readme.slice(0, start + START_MARKER.length);
  const after = readme.slice(end);
  return `${before}\n\n${generatedList}\n\n${after}`;
}

async function main() {
  const checkMode = process.argv.includes("--check");
  const readme = await readFile(README_PATH, "utf8");
  const generatedList = await buildDocsList();
  const nextReadme = replaceSection(readme, generatedList);

  if (checkMode) {
    if (readme !== nextReadme) {
      console.error("README docs index is out of date.");
      console.error("Run: node scripts/update-docs-index.mjs");
      process.exit(1);
    }
    console.log("README docs index is up to date.");
    return;
  }

  await writeFile(README_PATH, nextReadme, "utf8");
  console.log("Updated README docs index.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
