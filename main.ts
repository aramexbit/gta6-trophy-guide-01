/* Leonida Legends — entrypoint.
   Copies the static app and its screenshots into the output directory,
   then writes dossier.json there using the kit's buildDossier helper.
   The output directory comes from MAKEFUN_OUTPUT_DIR; without it, a
   local out/ folder next to this file is used for testing. */

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR
  ? process.env.MAKEFUN_OUTPUT_DIR
  : join(root, "out");

function copyTree(name: string): void {
  const from = join(root, name);
  const to = join(outDir, name);
  if (!existsSync(from)) {
    throw new Error("missing " + name + "/ directory next to main.ts");
  }
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}

async function main(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  copyTree("app");
  copyTree("screenshots");
  const dossier = await buildDossier(root, { text_max_bytes: 2097152 });
  writeFileSync(join(outDir, "dossier.json"), dossier);
  console.log("wrote " + join(outDir, "dossier.json"));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
