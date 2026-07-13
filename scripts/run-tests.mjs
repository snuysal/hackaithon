import { spawn } from "node:child_process";
import { createNodeTestArgs, createNodeTestEnv, getTestFiles, parseTestArguments, repositoryRoot } from "./test-runner.mjs";

let nodeFlags;
let pathFilters;
let testFiles;

try {
	({ nodeFlags, pathFilters } = parseTestArguments(process.argv.slice(2)));
	testFiles = getTestFiles(pathFilters);
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}

const child = spawn(
	process.execPath,
	createNodeTestArgs({ nodeFlags, testFiles }),
	{
		cwd: repositoryRoot,
		env: createNodeTestEnv(),
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
