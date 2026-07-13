import { readdirSync, statSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentDirectoryPath = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(currentDirectoryPath, "..");

const pathFilters = [];
const nodeFlags = [];

for (let index = 2; index < process.argv.length; index += 1) {
	const argument = process.argv[index];

	if (argument === "--path") {
		const nextValue = process.argv[index + 1];
		if (!nextValue) {
			console.error("Missing value for --path.");
			process.exit(1);
		}

		pathFilters.push(resolve(repositoryRoot, nextValue));
		index += 1;
		continue;
	}

	nodeFlags.push(argument);
}

const searchRoots = pathFilters.length > 0 ? pathFilters : [resolve(repositoryRoot, "apps"), resolve(repositoryRoot, "packages")];
const testFiles = searchRoots.flatMap(findTestFiles).sort();

if (testFiles.length === 0) {
	console.error("No test files were found.");
	process.exit(1);
}

const child = spawn(
	process.execPath,
	[
		"--import",
		pathToFileURL(resolve(repositoryRoot, "scripts/register-ts-node.mjs")).href,
		...nodeFlags,
		"--test",
		...testFiles,
	],
	{
		cwd: repositoryRoot,
		env: {
			...process.env,
			TS_NODE_PROJECT: resolve(repositoryRoot, "tsconfig.json"),
			TS_NODE_TRANSPILE_ONLY: "true",
		},
		stdio: "inherit",
	}
);

child.on("exit", code => {
	process.exit(code ?? 1);
});

child.on("error", error => {
	console.error(error);
	process.exit(1);
});

function findTestFiles(directoryPath) {
	const results = [];

	for (const entry of readdirSync(directoryPath)) {
		const entryPath = join(directoryPath, entry);
		const stats = statSync(entryPath);

		if (stats.isDirectory()) {
			if (entry === "dist" || entry === "node_modules") {
				continue;
			}

			results.push(...findTestFiles(entryPath));
			continue;
		}

		if (entry.endsWith(".test.ts") || entry.endsWith(".test.tsx")) {
			results.push(entryPath);
		}
	}

	return results;
}
