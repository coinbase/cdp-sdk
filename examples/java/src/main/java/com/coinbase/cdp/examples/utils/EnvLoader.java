package com.coinbase.cdp.examples.utils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Utility class for loading environment variables from a .env file.
 *
 * <p>This provides a simple way to configure examples without relying on system environment
 * variables. The loader searches for .env files in multiple locations and sets the values as system
 * properties, which the CDP SDK will read.
 */
public final class EnvLoader {

  private EnvLoader() {}

  /**
   * Loads environment variables from a .env file.
   *
   * <p>Searches for .env file in the following order:
   *
   * <ol>
   *   <li>Current working directory (.env)
   *   <li>examples/java/.env (when running from repo root)
   * </ol>
   *
   * <p>If no .env file is found, the loader silently continues, allowing system environment
   * variables to be used instead.
   *
   * @throws IOException if the .env file exists but cannot be read
   */
  public static void load() throws IOException {
    Path envFile = findEnvFile();

    if (envFile == null) {
      System.out.println(
          "No .env file found. Using system environment variables.\n"
              + "Copy .env.example to .env and configure your credentials.");
      return;
    }

    System.out.println("Loading environment from: " + envFile.toAbsolutePath());

    Files.lines(envFile)
        .map(String::trim)
        .filter(line -> !line.isEmpty() && !line.startsWith("#") && line.contains("="))
        .forEach(
            line -> {
              int idx = line.indexOf('=');
              String key = line.substring(0, idx).trim();
              String value = line.substring(idx + 1).trim();

              // Remove surrounding quotes if present
              if ((value.startsWith("\"") && value.endsWith("\""))
                  || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.substring(1, value.length() - 1);
              }

              // Set as system property so CdpClientOptions.fromEnvironment() can read it
              System.setProperty(key, value);
            });
  }

  private static Path findEnvFile() {
    // Check current directory first
    Path current = Path.of(".env");
    if (Files.exists(current)) {
      return current;
    }

    // Check examples/java directory (when running from repo root)
    Path examples = Path.of("examples", "java", ".env");
    if (Files.exists(examples)) {
      return examples;
    }

    return null;
  }
}
