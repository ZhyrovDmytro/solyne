import path from "node:path";

import { createBenchmarkArtifacts } from "./artifacts.js";
import { BodyPixSkinMaskEngine } from "../segmentation/body-pix-skin-mask-engine.js";

interface CliOptions {
  readonly inputs: string[];
  readonly maxEdge: number;
  readonly outputRoot: string;
}

function usage(): string {
  return [
    "Usage:",
    "  npm run benchmark:mask -- --input <photo> [--input <photo>] [--output <directory>] [--max-edge <pixels>]",
    "",
    "Private photos and benchmark-output/ are intentionally ignored by git.",
  ].join("\n");
}

function parsePositiveInteger(value: string | undefined, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} requires a positive integer`);
  }
  return parsed;
}

function parseArguments(args: readonly string[]): CliOptions {
  const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
  const inputs: string[] = [];
  let maxEdge = 1024;
  let outputRoot = path.resolve(invocationDirectory, "benchmark-output");

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--input") {
      const input = args[index + 1];
      if (input === undefined) throw new Error("--input requires a file path");
      inputs.push(path.resolve(invocationDirectory, input));
      index += 1;
    } else if (argument === "--output") {
      const output = args[index + 1];
      if (output === undefined) throw new Error("--output requires a directory path");
      outputRoot = path.resolve(invocationDirectory, output);
      index += 1;
    } else if (argument === "--max-edge") {
      maxEdge = parsePositiveInteger(args[index + 1], "--max-edge");
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      console.log(usage());
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument ?? ""}`);
    }
  }

  if (inputs.length === 0) throw new Error("At least one --input photo is required");
  return { inputs, maxEdge, outputRoot };
}

function safeArtifactName(inputPath: string, index: number): string {
  const base = path.basename(inputPath, path.extname(inputPath))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "photo";
  return `${String(index + 1).padStart(2, "0")}-${base}`;
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const engine = new BodyPixSkinMaskEngine();

  try {
    for (const [index, inputPath] of options.inputs.entries()) {
      const outputDirectory = path.join(options.outputRoot, safeArtifactName(inputPath, index));
      console.log(`Segmenting ${path.basename(inputPath)}…`);
      const manifest = await createBenchmarkArtifacts(engine, {
        inputPath,
        maxEdge: options.maxEdge,
        outputDirectory,
      });
      console.log(`Wrote ${manifest}`);
    }
  } finally {
    await engine.dispose();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown benchmark failure";
  console.error(`Mask benchmark failed: ${message}`);
  console.error(usage());
  process.exitCode = 1;
});
