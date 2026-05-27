#!/usr/bin/env tsx

/**
 * CI Check: Auth Crypto Imports
 *
 * This script ensures that all code in the @/auth subpackage uses the `uncrypto`
 * library instead of the built-in `crypto` library. It also checks for transitive
 * dependencies - e.g., if auth code imports external modules that use crypto.
 *
 * Usage: tsx scripts/check-auth-crypto-imports.ts
 * Exit codes: 0 = success, 1 = violations found
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const AUTH_DIR = path.join(__dirname, "..", "src", "auth");
const SRC_DIR = path.join(__dirname, "..", "src");

// Patterns to match
const CRYPTO_IMPORT_PATTERN =
  /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+['"](?:node:)?crypto['"]|require\s*\(\s*['"](?:node:)?crypto['"]?\s*\)/g;
const IMPORT_PATTERN =
  /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)?\s*from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g;

/**
 * Type for violation details
 */
interface Violation {
  file: string;
  type: string;
  message: string;
  evidence: string[];
  importChain: string[];
}

/**
 * Auth crypto imports checker
 */
class AuthCryptoChecker {
  private violations: Violation[] = [];
  private visitedFiles = new Set<string>();
  private analysisStack: string[] = [];

  /**
   * Main entry point for the checker
   *
   * @returns True if no violations found, false otherwise
   */
  async check(): Promise<boolean> {
    console.log("🔍 Checking auth subpackage for crypto imports...\n");

    try {
      // Get all TypeScript files in the auth directory
      const authFiles = await this.getTypeScriptFiles(AUTH_DIR);
      console.log(`Found ${authFiles.length} TypeScript files in auth subpackage:`);
      authFiles.forEach(file => console.log(`  - ${path.relative(SRC_DIR, file)}`));
      console.log();

      // Analyze each auth file
      for (const file of authFiles) {
        await this.analyzeFile(file);
      }

      // Report results
      this.reportResults();

      return this.violations.length === 0;
    } catch (error) {
      console.error("❌ Error during analysis:", (error as Error).message);
      return false;
    }
  }

  /**
   * Recursively get all TypeScript files in a directory
   *
   * @param dir - Directory path to scan
   * @returns Array of TypeScript file paths
   */
  private async getTypeScriptFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    const items = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        const subFiles = await this.getTypeScriptFiles(fullPath);
        files.push(...subFiles);
      } else if (item.isFile() && /\.tsx?$/.test(item.name)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Analyze a file for crypto usage and imports
   *
   * @param filePath - Path to the file to analyze
   */
  private async analyzeFile(filePath: string): Promise<void> {
    const normalizedPath = path.resolve(filePath);

    // Avoid circular dependencies
    if (this.visitedFiles.has(normalizedPath)) {
      return;
    }

    this.visitedFiles.add(normalizedPath);
    this.analysisStack.push(path.relative(SRC_DIR, filePath));

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return;
      }

      const content = await fs.promises.readFile(filePath, "utf-8");

      // Check for direct crypto imports
      const cryptoMatches = [...content.matchAll(CRYPTO_IMPORT_PATTERN)];
      if (cryptoMatches.length > 0) {
        this.addViolation(
          filePath,
          "DIRECT_CRYPTO_IMPORT",
          `File directly imports 'crypto' or 'node:crypto' library`,
          cryptoMatches.map(match => match[0]),
          [...this.analysisStack],
        );
      }

      // Extract and analyze imports
      const imports = this.extractImports(content);

      for (const importPath of imports) {
        const resolvedPath = this.resolveImport(importPath, filePath);
        if (resolvedPath) {
          await this.analyzeFile(resolvedPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not analyze ${filePath}: ${(error as Error).message}`);
    } finally {
      this.analysisStack.pop();
    }
  }

  /**
   * Extract import paths from file content
   *
   * @param content - File content to parse
   * @returns Array of import paths
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    let match: RegExpExecArray | null;

    // Reset the regex
    IMPORT_PATTERN.lastIndex = 0;

    while ((match = IMPORT_PATTERN.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      if (importPath) {
        imports.push(importPath);
      }
    }

    return imports;
  }

  /**
   * Resolve an import path to an actual file path
   *
   * @param importPath - Import path to resolve
   * @param fromFile - File that contains the import
   * @returns Resolved file path or null if not found
   */
  private resolveImport(importPath: string, fromFile: string): string | null {
    // Skip node_modules and external packages
    if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
      return null;
    }

    const fromDir = path.dirname(fromFile);
    let resolvedPath: string;

    if (importPath.startsWith(".")) {
      // Relative import
      resolvedPath = path.resolve(fromDir, importPath);
    } else {
      // Absolute import (shouldn't happen in our codebase, but handle it)
      resolvedPath = path.resolve(SRC_DIR, importPath.replace(/^\//, ""));
    }

    /*
     * If the import has a .js extension, try replacing it with .ts first
     * This handles TypeScript imports that use .js extensions for ES modules
     */
    if (resolvedPath.endsWith(".js")) {
      const tsPath = resolvedPath.replace(/\.js$/, ".ts");
      if (fs.existsSync(tsPath)) {
        return tsPath;
      }
      const tsxPath = resolvedPath.replace(/\.js$/, ".tsx");
      if (fs.existsSync(tsxPath)) {
        return tsxPath;
      }
    }

    // Check if it's already a file with extension
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }

    // Try different extensions
    const extensions = [".ts", ".tsx", ".js", ".jsx"];

    // Try adding extensions if the path doesn't have one
    const hasExtension = /\.\w+$/.test(resolvedPath);
    if (!hasExtension) {
      for (const ext of extensions) {
        const withExt = `${resolvedPath}${ext}`;
        if (fs.existsSync(withExt)) {
          return withExt;
        }
      }

      // Try as directory with index file
      for (const ext of extensions) {
        const indexFile = path.join(resolvedPath, `index${ext}`);
        if (fs.existsSync(indexFile)) {
          return indexFile;
        }
      }
    }

    return null;
  }

  /**
   * Add a violation to the list
   *
   * @param filePath - Path to the violating file
   * @param type - Type of violation
   * @param message - Description of the violation
   * @param evidence - Evidence of the violation
   * @param importChain - Chain of imports leading to violation
   */
  private addViolation(
    filePath: string,
    type: string,
    message: string,
    evidence: string[],
    importChain: string[],
  ): void {
    this.violations.push({
      file: path.relative(SRC_DIR, filePath),
      type,
      message,
      evidence,
      importChain: [...importChain],
    });
  }

  /**
   * Report the analysis results
   */
  private reportResults(): void {
    console.log("📊 Analysis Results:");
    console.log("==================\n");

    if (this.violations.length === 0) {
      console.log("✅ No crypto imports violations found!");
      console.log(
        "   All files in the auth subpackage correctly use uncrypto or have no crypto imports.\n",
      );
      return;
    }

    console.log(`❌ Found ${this.violations.length} crypto imports violation(s):\n`);

    this.violations.forEach((violation, index) => {
      console.log(`${index + 1}. ${violation.file}`);
      console.log(`   Type: ${violation.type}`);
      console.log(`   Issue: ${violation.message}`);

      if (violation.evidence && violation.evidence.length > 0) {
        console.log(`   Evidence:`);
        violation.evidence.forEach(evidence => {
          console.log(`     - ${evidence}`);
        });
      }

      if (violation.importChain.length > 1) {
        console.log(`   Import chain:`);
        violation.importChain.forEach((file, i) => {
          console.log(`     ${"  ".repeat(i)}→ ${file}`);
        });
      }

      console.log();
    });

    console.log("💡 To fix these violations:");
    console.log("   - Replace crypto imports with uncrypto imports");
    console.log("   - Avoid importing external modules that use crypto");
    console.log("   - Create auth-specific versions of utilities if needed\n");
  }
}

// Run the checker if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new AuthCryptoChecker();

  checker
    .check()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error("❌ Fatal error:", error);
      process.exit(1);
    });
}

export { AuthCryptoChecker };
