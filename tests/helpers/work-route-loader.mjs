import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const STUBS = {
  "@/libs/dataRepository": path.join(
    ROOT,
    "tests",
    "helpers",
    "stubs",
    "dataRepository.mjs",
  ),
  "next-auth/jwt": path.join(
    ROOT,
    "tests",
    "helpers",
    "stubs",
    "nextAuthJwt.mjs",
  ),
  "next/server": path.join(ROOT, "node_modules", "next", "server.js"),
};

function isFile(candidate) {
  try {
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function withExtension(candidate) {
  if (isFile(candidate)) return candidate;
  for (const suffix of [".js", ".jsx", ".mjs", "/index.js"]) {
    if (isFile(candidate + suffix)) return candidate + suffix;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (STUBS[specifier]) {
    return { url: pathToFileURL(STUBS[specifier]).href, shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    const resolved = withExtension(path.join(ROOT, "src", specifier.slice(2)));
    if (resolved) {
      return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}
