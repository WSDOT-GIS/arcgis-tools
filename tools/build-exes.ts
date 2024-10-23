#!/usr/bin/env bun

/**
 * Builds executables for the project.
 */

import { dirname, join, parse } from "node:path";
import type { Subprocess } from "bun";

const thisScriptPath = parse(import.meta.file);
const root = dirname(thisScriptPath.dir);
const binDir = join(root, "bin") as `${string}/bin`;
const srcDir = join(root, "src") as `${string}/src`;

/**
 * List of possible targets for the executables.
 * @see https://bun.sh/docs/bundler/executables#cross-compile-to-other-platforms
 */
const targets = [
	"bun-linux-x64",
	"bun-linux-arm64",
	"bun-windows-x64",
	// "bun-windows-arm64",
	"bun-darwin-x64",
	"bun-darwin-arm64",
] as const;

/**
 * Regular expression for parsing the target name.
 */
const targetRe = /^bun-(?<os>[^-]+)-(?<arch>\w+64)$/i;

type OperatingSystem = "linux" | "darwin" | "windows";

type Architecture = "x64" | "arm64";

/**
 * Operating System (OS) and Architecture for the executables.
 */
interface OSAndArch {
	os: OperatingSystem;
	architecture: Architecture;
}

/**
 * Given a target name, returns the OS and Architecture for the executable.
 *
 * @param target - a valid target from the `targets` array
 * @returns - the OS and Architecture for the target
 * @throws if the target is invalid
 */
function parseTarget(target: (typeof targets)[number]): OSAndArch {
	const match = targetRe.exec(target);
	if (!match?.groups) {
		throw new Error(`invalid target: ${target}`);
	}
	return {
		os: match.groups.os,
		architecture: match.groups.arch,
	} as OSAndArch;
}

/**
 * Defines the scripts to be compiled.
 * (Currently, only a single script is compiled.)
 */
const exeSourceNames = ["dump-stylx"] as const;

/**
 * This array will hold the promises for each spawned process.
 */
const spawnedProcesses: Subprocess[] = [];

// Loop through all of the scripts to be compiled.
for (const exeSourceName of exeSourceNames) {
	// Create the path to the source script file.
	const srcFile = join(srcDir, `${exeSourceName}.ts`);
	// Loop through all of the targets.
	for (const target of targets) {
		// Parse the OS and architecture from the target.
		const { os, architecture: arch } = parseTarget(target);

		const exe =
			os === "windows"
				? join(binDir, exeSourceName)
				: join(binDir, os, arch, exeSourceName);

		const spawned = Bun.spawn(
			[
				"bun",
				"build",
				"--compile",
				`--target=${target}`,
				srcFile,
				`--outfile=${exe}`,
			],
			{
				stdout: "inherit",
				stderr: "inherit",
			},
		);
		spawnedProcesses.push(spawned);
	}
}

const spawnedResults = await Promise.allSettled(spawnedProcesses);

for (const spawnedResult of spawnedResults) {
	if (spawnedResult.status === "rejected") {
		console.error(spawnedResult.reason);
	}
}
