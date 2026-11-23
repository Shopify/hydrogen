import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

/**
 * Env for framework config files, which load before the framework reads `.env`. Like Vite,
 * variables already in `process.env` win over `.env`. Config-time values are baked in at build
 * time, so build with the same env you start the server with.
 */
export function readConfigEnv(projectDir: URL): Record<string, string | undefined> {
  const envPath = new URL(".env", projectDir);
  const fileEnv = existsSync(envPath) ? parseEnv(readFileSync(envPath, "utf8")) : {};
  return { ...fileEnv, ...process.env };
}
