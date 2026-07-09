/**
 * Custom TypeDoc router for the CDP backend TypeScript SDK.
 * Adapted from cdp-web's typedoc-router-module-group.mjs.
 *
 * Uses @group JSDoc tags to organize members into directories.
 * Falls back to the parent Module name (from @module tag) when
 * no explicit @group is present — so @module Client → Client/,
 * @module Types → Types/, etc. with no extra per-declaration tags needed.
 */
import * as fs from "fs";
import * as path from "path";
import { MemberRouter, MarkdownPageEvent } from "typedoc-plugin-markdown";
import { Comment, ReflectionKind, ReferenceReflection } from "typedoc";

class BackendGroupRouter extends MemberRouter {
  groupReferencesByType = this.application.options.getValue("groupReferencesByType") ?? false;

  /**
   * Read @group tags from a reflection's JSDoc comment.
   * Returns a Set of group names (empty if none found).
   */
  getGroups(reflection) {
    const groups = new Set();

    function extractGroupTags(comment) {
      if (!comment) return;
      for (const tag of comment.blockTags) {
        if (tag.tag === "@group") {
          groups.add(Comment.combineDisplayParts(tag.content).trim());
        }
      }
    }

    if (reflection.isDeclaration()) {
      extractGroupTags(reflection.comment);
      for (const sig of reflection.getNonIndexSignatures()) {
        extractGroupTags(sig.comment);
      }
      if (reflection.type?.type === "reflection") {
        extractGroupTags(reflection.type.declaration.comment);
        for (const sig of reflection.type.declaration.getNonIndexSignatures()) {
          extractGroupTags(sig.comment);
        }
      }
    }

    groups.delete("");
    return groups;
  }

  /**
   * Determine the group directory for a reflection:
   * 1. Explicit @group tag on the declaration
   * 2. Parent Module name (from @module tag at the top of the file)
   * 3. TypeDoc kind plural string (fallback)
   */
  getGroupForReflection(reflection) {
    if (!reflection.isDeclaration() && !reflection.isDocument()) return null;

    const groups = this.getGroups(reflection);
    if (groups.size > 0) return groups.values().next().value;

    // Use the owning Module name as the group directory — this means @module Client
    // in a file automatically puts all exports in the Client/ directory.
    // Walk the full ancestor chain to the nearest Module so that members nested
    // inside a `declare namespace` (whose immediate parent is a Namespace, not the
    // Module) still resolve to their owning module instead of falling through to
    // the kind-plural fallback and landing at the output root.
    for (let ancestor = reflection.parent; ancestor; ancestor = ancestor.parent) {
      if (ancestor.kind === ReflectionKind.Module) {
        return ancestor.name;
      }
    }

    if (reflection instanceof ReferenceReflection && this.groupReferencesByType) {
      return ReflectionKind.pluralString(reflection.getTargetReflectionDeep().kind).toLowerCase();
    }

    return ReflectionKind.pluralString(reflection.kind).toLowerCase();
  }

  /**
   * Override directory resolution to use the group-based path.
   * With entryPointStrategy: "resolve", top-level exports are children
   * of a Module (kind=1). We strip the module path segment so files
   * land directly in the group directory within the output root.
   */
  getReflectionDirectory(reflection) {
    if (!reflection.parent) return "";

    const group = this.getGroupForReflection(reflection);
    const groupDir = group ?? "Other";

    // Top-level within a Module (each resolve entry point → Module)
    if (reflection.parent.kind === ReflectionKind.Module) {
      return groupDir;
    }

    // Top-level within the Project root
    if (reflection.parent.kind === ReflectionKind.Project) {
      return groupDir;
    }

    // Nested within another declaration (e.g. members of a `declare namespace`).
    // Place them UNDER the owning module directory (groupDir), inside a subdir
    // named for the immediate parent, so they fold beneath the module instead of
    // creating a sibling top-level directory.
    return `${groupDir}/${this.getReflectionAlias(reflection.parent)}`;
  }
}

export function load(app) {
  app.renderer.defineRouter("backend-group", BackendGroupRouter);

  // After all pages are written, merge index-N.mdx files (TypeDoc's conflict resolution
  // when multiple @module entries share the same name, e.g. @module Types) into the
  // primary index.mdx so each directory has exactly one flat page.
  app.renderer.on("endRender", event => {
    const outDir = event.outputDirectory;
    if (!outDir || !fs.existsSync(outDir)) return;

    // Track all index-N paths that get merged so we can rewrite cross-links.
    const mergedPaths = new Map(); // "dir/index-N" → "dir/index"

    function mergeIndexFiles(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          mergeIndexFiles(path.join(dir, entry.name));
        }
      }
      const numbered = entries
        .filter(e => e.isFile() && /^index-\d+\.mdx$/.test(e.name))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      if (numbered.length === 0) return;

      const primary = path.join(dir, "index.mdx");
      if (!fs.existsSync(primary)) return;

      let merged = fs.readFileSync(primary, "utf-8");
      for (const n of numbered) {
        const nPath = path.join(dir, n.name);
        let extra = fs.readFileSync(nPath, "utf-8");
        extra = extra.replace(/^---[\s\S]*?---\n/, "");
        merged = merged.trimEnd() + "\n\n" + extra.trimStart();
        // Record the relative path mapping (without .mdx) for link rewriting.
        const relDir = path.relative(outDir, dir).replace(/\\/g, "/");
        const stem = n.name.replace(/\.mdx$/, "");
        mergedPaths.set(`${relDir}/${stem}`, `${relDir}/index`);
        fs.unlinkSync(nPath);
      }
      fs.writeFileSync(primary, merged, "utf-8");
    }

    mergeIndexFiles(outDir);

    // Rewrite all cross-links that still point to the now-deleted index-N paths.
    if (mergedPaths.size > 0) {
      function rewriteLinks(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) { rewriteLinks(full); continue; }
          if (!entry.name.endsWith(".mdx")) continue;
          let content = fs.readFileSync(full, "utf-8");
          let changed = false;
          for (const [oldRel, newRel] of mergedPaths) {
            // Escape all regex special characters in the path before interpolating.
            const escaped = oldRel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const pattern = new RegExp(
              `(\\]\\([^)]*?)${escaped}((?:#[^)]*)?\\))`, "g"
            );
            const updated = content.replace(pattern, `$1${newRel}$2`);
            if (updated !== content) { content = updated; changed = true; }
          }
          if (changed) fs.writeFileSync(full, content, "utf-8");
        }
      }
      rewriteLinks(outDir);
    }

    // De-duplicate identical module bullets in the root index.mdx. When a module is
    // surfaced by more than one entry point (e.g. a resource's client `Client.ts` and
    // its barrel `index.ts` both carry the same `@module` name), TypeDoc emits one
    // bullet per entry point, all resolving to the same `<Module>/index` page. Collapse
    // exact-duplicate `- [Label](url)` lines (keeping first occurrence) so the index
    // lists each module once, matching the hand-written doc sets. No-op for sets whose
    // index has no duplicate bullets.
    const rootIndex = path.join(outDir, "index.mdx");
    if (fs.existsSync(rootIndex)) {
      const seen = new Set();
      const deduped = fs
        .readFileSync(rootIndex, "utf-8")
        .split("\n")
        .filter(line => {
          if (!/^\s*[-*]\s+\[[^\]]+\]\([^)]+\)\s*$/.test(line)) return true;
          if (seen.has(line)) return false;
          seen.add(line);
          return true;
        })
        .join("\n");
      fs.writeFileSync(rootIndex, deduped, "utf-8");
    }
  });

  // Strip .mdx extension from internal links so Mintlify can resolve them.
  // TypeDoc generates links like [Foo](/path/Foo.mdx) but Mintlify expects /path/Foo.
  app.renderer.on(MarkdownPageEvent.END, event => {
    if (!event.contents) return;

    // Strip .mdx from links.
    event.contents = event.contents.replace(/(\]\([^)#]+)\.mdx((?:#[^)]*)?)\)/g, "$1$2)");

    // Escape bare {identifier} and {orgId/keyId} patterns outside code blocks/spans.
    // In MDX, {expr} is a JSX expression — unrecognised identifiers cause production build failures.
    // Strategy: walk the content line by line, skip fenced code blocks, then within each
    // text line replace {word} outside of backtick spans.
    let inFence = false;
    event.contents = event.contents.split("\n").map(line => {
      if (/^```/.test(line)) { inFence = !inFence; return line; }
      if (inFence) return line;
      // Replace {word} outside inline code spans (backtick pairs are kept intact).
      return line.replace(/(`[^`]*`)|(\{[^}]*\})/g, (match, code, expr) => {
        if (code) return code; // inside inline code — leave unchanged
        // Use HTML entities so MDX treats them as literal characters.
        // Avoids incomplete backslash-escaping when expr contains backslashes.
        return expr.replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");
      });
    }).join("\n");
  });

  // Escape pipe characters inside @pattern values in table cells so they don't
  // break Markdown table column alignment. Ported from cdp-web/typedoc-markdown.mjs.
  app.renderer.on(MarkdownPageEvent.END, event => {
    if (!event.contents?.includes("**Pattern**")) return;

    event.contents = event.contents.replace(
      /^(\|.+)\*\*Pattern\*\*\s+(.+)(\s\|)$/gm,
      (_, before, pattern, end) =>
        `${before}\`Pattern: ${pattern.replace(/\|/g, "&#124;")}\`${end}`,
    );

    event.contents = event.contents.replace(
      /(\*\*Pattern\*\*\s+)([^`\n]+)/g,
      (_, label, pattern) => `${label}\`${pattern.trim()}\``,
    );
  });
}
