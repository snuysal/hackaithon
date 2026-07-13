import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentDirectoryPath = dirname(fileURLToPath(import.meta.url));

export const repositoryRoot = resolve(currentDirectoryPath, "..");

export function parseTestArguments(argv) {
	const pathFilters = [];
	const nodeFlags = [];

	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];

		if (argument === "--path") {
			const nextValue = argv[index + 1];
			if (!nextValue) {
				throw new Error("Missing value for --path.");
			}

			pathFilters.push(resolve(repositoryRoot, nextValue));
			index += 1;
			continue;
		}

		nodeFlags.push(argument);
	}

	return { nodeFlags, pathFilters };
}

export function getTestFiles(pathFilters = []) {
	const searchRoots =
		pathFilters.length > 0 ? pathFilters : [resolve(repositoryRoot, "apps"), resolve(repositoryRoot, "packages")];
	const testFiles = searchRoots.flatMap(findTestFiles).sort();

	if (testFiles.length === 0) {
		throw new Error("No test files were found.");
	}

	return testFiles;
}

export function createNodeTestArgs({ nodeFlags = [], testFiles }) {
	return [
		"--import",
		pathToFileURL(resolve(repositoryRoot, "scripts/register-ts-node.mjs")).href,
		...nodeFlags,
		"--test",
		...testFiles,
	];
}

export function createNodeTestEnv() {
	return {
		...process.env,
		TS_NODE_PROJECT: resolve(repositoryRoot, "tsconfig.json"),
		TS_NODE_TRANSPILE_ONLY: "true",
	};
}

function findTestFiles(directoryPath) {
	const results = [];

	for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
		const entryPath = join(directoryPath, entry.name);

		if (entry.isDirectory()) {
			if (entry.name === "dist" || entry.name === "node_modules") {
				continue;
			}

			results.push(...findTestFiles(entryPath));
			continue;
		}

		if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) {
			results.push(entryPath);
		}
	}

	return results;
}
