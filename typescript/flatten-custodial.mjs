/**
 * Post-generation flatten step for the custodial TypeScript SDK docs.
 *
 * The custodial TypeDoc build (typedoc.custodial.json) emits into
 * ./docs-md/custodial/ with one directory per resource module
 * (Accounts, PaymentMethods, Transfers, DepositDestinations) plus a
 * Client/ directory (the base CoinbaseApiClient transport) and an Overview
 * index.mdx.
 *
 * The docs site (cdp-docs) promotes each ROOT directory under docs-md/ to a
 * top-level nav group. To make each custodial resource its own top-level group
 * — siblings of evm/ and solana/ — this script moves the resource directories
 * up to the docs-md/ root and drops the custodial wrapper.
 *
 * It:
 *   1. Deletes docs-md/custodial/index.mdx (the custodial Overview; the SDK
 *      root index.mdx already exists and nothing links to this one).
 *   2. Deletes docs-md/custodial/Client/ (the base CoinbaseApiClient — not a
 *      custodial resource; nothing outside Client/ links to it).
 *   3. Moves every remaining entry (Accounts, PaymentMethods, Transfers,
 *      DepositDestinations) up into docs-md/, replacing any stale copy
 *      from a previous run so the step is idempotent.
 *   4. Removes the now-empty docs-md/custodial/.
 *   5. Rewrites residual ".../typescript/custodial/..." link targets in the
 *      moved files to the flattened ".../typescript/..." paths.
 *   6. Relabels each resource module-overview index.mdx to "Types" and strips
 *      client-only Classes/Namespaces sections.
 *   7. Strips the auto-generated "## Constructors" section from each resource
 *      client page (<Resource>Client.mdx), keeping "## Methods" and everything
 *      else — users never construct these clients directly.
 *
 * Deep pages (namespaces/, per-client Options, nested type dirs, flat
 * type-alias files) are intentionally kept ON DISK so internal cross-links
 * still resolve; the docs.json navigation curates which of them are surfaced
 * (mirroring how evm/ keeps its flat Types files on disk but lists only
 * Types/index in the sidebar).
 */
import * as fs from "fs";
import * as path from "path";

const docsMd = path.resolve("./docs-md");
const custodialDir = path.join(docsMd, "custodial");

if (!fs.existsSync(custodialDir)) {
  console.error(`[flatten-custodial] ${custodialDir} does not exist — did the custodial TypeDoc build run?`);
  process.exit(1);
}

// The custodial link prefix that must be collapsed to the flattened root.
const CUSTODIAL_LINK_PREFIX = "/sdks/cdp-sdks-v2/typescript/custodial/";
const FLAT_LINK_PREFIX = "/sdks/cdp-sdks-v2/typescript/";

// Entries that are removed rather than promoted.
const DROP = new Set(["index.mdx", "Client"]);

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

// 1 + 2: drop the Overview index and the base Client transport.
rmrf(path.join(custodialDir, "index.mdx"));
rmrf(path.join(custodialDir, "Client"));
console.log("[flatten-custodial] removed custodial/index.mdx and custodial/Client/");

// 3: promote the remaining resource directories to the docs-md root.
const moved = [];
for (const entry of fs.readdirSync(custodialDir, { withFileTypes: true })) {
  if (DROP.has(entry.name)) continue;
  const from = path.join(custodialDir, entry.name);
  const to = path.join(docsMd, entry.name);
  // Idempotent: clear any stale copy left by a previous run before moving.
  rmrf(to);
  fs.renameSync(from, to);
  moved.push(entry.name);
}
console.log(`[flatten-custodial] promoted to docs-md/: ${moved.join(", ")}`);

// 4: remove the now-empty custodial wrapper directory.
rmrf(custodialDir);

// 5: rewrite residual custodial link targets in the moved files.
let rewritten = 0;
function rewriteLinks(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteLinks(full);
      continue;
    }
    if (!entry.name.endsWith(".mdx")) continue;
    const content = fs.readFileSync(full, "utf-8");
    if (!content.includes(CUSTODIAL_LINK_PREFIX)) continue;
    const updated = content.split(CUSTODIAL_LINK_PREFIX).join(FLAT_LINK_PREFIX);
    fs.writeFileSync(full, updated, "utf-8");
    rewritten++;
  }
}
for (const name of moved) {
  rewriteLinks(path.join(docsMd, name));
}
console.log(`[flatten-custodial] rewrote custodial links in ${rewritten} file(s)`);

// 6: relabel each resource module-overview page to "Types" and strip the
// client-only sections, so the sidebar entry reads "Types" (matching the EVM
// group's Client + Types shape) and the page presents as a near-pure types page.
//
// The merged <Resource>/index.mdx carries, from merge-concatenation, small
// client-only sections: a `## Classes` and a `## Namespaces` that only re-link
// the resource client (already listed as its own nav entry). We drop those while
// keeping real type namespaces (e.g. TransferDetails), interfaces, type aliases.
const RESOURCE_DIRS = ["Accounts", "PaymentMethods", "Transfers", "DepositDestinations"];

/**
 * Split an mdx body into `## ` sections. Everything before the first `## `
 * heading is returned as `preamble`; each section spans a `## ` line up to the
 * next `## ` line or EOF (so `###`/`####` subsections stay with their parent).
 */
function splitSections(body) {
  const lines = body.split("\n");
  const preamble = [];
  const sections = [];
  let current = null;
  for (const line of lines) {
    if (/^## /.test(line)) {
      current = { header: line, lines: [line] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  return { preamble, sections };
}

function relabelResourceIndex(dir) {
  const clientName = `${dir}Client`;
  const file = path.join(docsMd, dir, "index.mdx");
  if (!fs.existsSync(file)) return;

  const raw = fs.readFileSync(file, "utf-8");
  const fmMatch = raw.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/);
  if (!fmMatch) return;

  // Relabel frontmatter title + sidebarTitle to "Types".
  let frontmatter = fmMatch[1]
    .replace(/^title:.*$/m, "title: Types")
    .replace(/^sidebarTitle:.*$/m, "sidebarTitle: Types");

  // Strip client-only bullets from `## Classes` / `## Namespaces` sections.
  const clientBullet = new RegExp(`^- \\[${clientName}\\]\\(`);
  const { preamble, sections } = splitSections(fmMatch[2]);
  const kept = [];
  for (const section of sections) {
    if (/^## (Classes|Namespaces)\b/.test(section.header)) {
      const filtered = section.lines.filter((l, i) => i === 0 || !clientBullet.test(l));
      const hasBullet = filtered.some(l => /^- \[/.test(l));
      if (!hasBullet) continue; // section only referenced the client — drop it
      section.lines = filtered;
    }
    kept.push(...section.lines);
  }

  let body = [...preamble, ...kept].join("\n");
  // Collapse 3+ consecutive blank lines left by removed sections to a single blank.
  body = body.replace(/\n{3,}/g, "\n\n");

  fs.writeFileSync(file, frontmatter + body, "utf-8");
}

for (const dir of RESOURCE_DIRS) {
  relabelResourceIndex(dir);
}
console.log(`[flatten-custodial] relabelled to "Types" + stripped client sections: ${RESOURCE_DIRS.join(", ")}`);

// 7: strip the auto-generated `## Constructors` section from each resource
// client page. TypeDoc emits `## Constructors` (a `### Constructor` with the
// `new <Resource>Client(options)` signature) for every documented class; these
// clients are obtained from the SDK, never constructed directly, so the section
// is noise. We drop only that `## ` section and keep `## Methods` and the rest.
function stripConstructors(dir) {
  const file = path.join(docsMd, dir, `${dir}Client.mdx`);
  if (!fs.existsSync(file)) return;

  const raw = fs.readFileSync(file, "utf-8");
  const fmMatch = raw.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/);
  if (!fmMatch) return;

  const frontmatter = fmMatch[1];
  const { preamble, sections } = splitSections(fmMatch[2]);
  const kept = [];
  for (const section of sections) {
    if (/^## Constructors\b/.test(section.header)) continue; // drop it
    kept.push(...section.lines);
  }

  let body = [...preamble, ...kept].join("\n");
  // Collapse 3+ consecutive blank lines left by the removed section.
  body = body.replace(/\n{3,}/g, "\n\n");

  fs.writeFileSync(file, frontmatter + body, "utf-8");
}

for (const dir of RESOURCE_DIRS) {
  stripConstructors(dir);
}
console.log(`[flatten-custodial] stripped "## Constructors" from client pages: ${RESOURCE_DIRS.join(", ")}`);
console.log("[flatten-custodial] done");
