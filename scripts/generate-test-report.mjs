import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, relative, resolve } from "node:path";

import { createNodeTestArgs, createNodeTestEnv, getTestFiles, parseTestArguments, repositoryRoot } from "./test-runner.mjs";

const reportDirectoryPath = resolve(repositoryRoot, "reports", "tests");
const junitReportPath = join(reportDirectoryPath, "junit.xml");
const htmlReportPath = join(reportDirectoryPath, "index.html");

let nodeFlags;
let pathFilters;

try {
	({ nodeFlags, pathFilters } = parseTestArguments(process.argv.slice(2)));
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}

let testFiles;

try {
	testFiles = getTestFiles(pathFilters);
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}

mkdirSync(reportDirectoryPath, { recursive: true });

const reportFlags = [
	"--test-reporter=spec",
	"--test-reporter-destination=stdout",
	"--test-reporter=junit",
	`--test-reporter-destination=${junitReportPath}`,
	...nodeFlags,
];

const child = spawn(process.execPath, createNodeTestArgs({ nodeFlags: reportFlags, testFiles }), {
	cwd: repositoryRoot,
	env: createNodeTestEnv(),
	stdio: "inherit",
});

child.on("exit", code => {
	try {
		const report = parseJunitReport(readFileSync(junitReportPath, "utf8"));
		writeFileSync(htmlReportPath, buildHtmlReport(report), "utf8");
		console.log(`\nHTML test report generated at ${relative(repositoryRoot, htmlReportPath)}`);
	} catch (error) {
		console.error(`\nFailed to generate HTML report: ${error instanceof Error ? error.message : error}`);
		process.exit(code ?? 1);
	}

	process.exit(code ?? 0);
});

child.on("error", error => {
	console.error(error);
	process.exit(1);
});

function parseJunitReport(xml) {
	const metrics = {
		tests: readMetric(xml, "tests"),
		suites: readMetric(xml, "suites"),
		passed: readMetric(xml, "pass"),
		failed: readMetric(xml, "fail"),
		cancelled: readMetric(xml, "cancelled"),
		skipped: readMetric(xml, "skipped"),
		todo: readMetric(xml, "todo"),
		durationMs: readMetric(xml, "duration_ms"),
	};

	const testCases = Array.from(xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/gmu)).map(match => {
		const attributes = parseAttributes(match[1] ?? "");
		const body = match[2] ?? "";
		const failureMatch = body.match(/<failure\b([^>]*)>([\s\S]*?)<\/failure>/mu);
		const skippedMatch = body.match(/<skipped\b([^>]*)\/?>/mu);
		const status = failureMatch ? "failed" : skippedMatch ? "skipped" : "passed";
		const failureAttributes = parseAttributes(failureMatch?.[1] ?? "");
		const failureOutput = decodeXml(stripCdata((failureMatch?.[2] ?? "").trim()));

		return {
			className: attributes.classname ?? "",
			durationSeconds: Number(attributes.time ?? "0"),
			errorDetails: failureOutput,
			errorMessage: decodeXml(failureAttributes.message ?? ""),
			filePath: normalizeFilePath(attributes.file ?? ""),
			name: decodeXml(attributes.name ?? ""),
			status,
		};
	});

	const files = Array.from(groupByFile(testCases)).map(([filePath, cases]) => ({
		filePath,
		failed: cases.filter(testCase => testCase.status === "failed").length,
		passed: cases.filter(testCase => testCase.status === "passed").length,
		skipped: cases.filter(testCase => testCase.status === "skipped").length,
		testCases: cases,
	}));

	return {
		files,
		generatedAtIso: new Date().toISOString(),
		metrics,
	};
}

function buildHtmlReport(report) {
	const summaryCards = [
		createMetricCard("Tests", String(report.metrics.tests), "Alle uitgevoerde tests"),
		createMetricCard("Geslaagd", String(report.metrics.passed), "Groen afgerond"),
		createMetricCard("Mislukt", String(report.metrics.failed), "Direct aandacht nodig", report.metrics.failed > 0 ? "danger" : "ok"),
		createMetricCard("Overgeslagen", String(report.metrics.skipped), "Niet uitgevoerd"),
		createMetricCard("Duur", formatDuration(report.metrics.durationMs), "Totale runtime"),
	];

	const fileSections = report.files
		.map(file =>
			`<section class="file-card">
				<div class="file-card__header">
					<div>
						<h2>${escapeHtml(file.filePath || "(onbekend bestand)")}</h2>
						<p>${file.testCases.length} tests · ${file.passed} geslaagd · ${file.failed} mislukt · ${file.skipped} overgeslagen</p>
					</div>
					<span class="pill pill--${file.failed > 0 ? "danger" : "ok"}">${file.failed > 0 ? "Issues" : "OK"}</span>
				</div>
				<div class="test-list">
					${file.testCases.map(renderTestCase).join("")}
				</div>
			</section>`
		)
		.join("");

	return `<!doctype html>
<html lang="nl">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Test Report</title>
	<style>
		:root {
			--bg: #f3efe7;
			--panel: #fffdf8;
			--border: #d8cfbf;
			--text: #1f2937;
			--muted: #667085;
			--ok: #126a43;
			--ok-soft: #d9f4e7;
			--danger: #9f1239;
			--danger-soft: #ffe0e7;
			--accent: #b45309;
			--shadow: 0 14px 30px rgba(31, 41, 55, 0.08);
		}

		* { box-sizing: border-box; }
		body {
			margin: 0;
			font-family: "Segoe UI", "Inter", sans-serif;
			background:
				radial-gradient(circle at top left, rgba(180, 83, 9, 0.14), transparent 30%),
				linear-gradient(180deg, #faf6ef 0%, var(--bg) 100%);
			color: var(--text);
		}

		main {
			width: min(1120px, calc(100% - 32px));
			margin: 0 auto;
			padding: 40px 0 64px;
		}

		.hero {
			background: linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(70, 58, 45, 0.94));
			color: white;
			border-radius: 28px;
			padding: 32px;
			box-shadow: var(--shadow);
			margin-bottom: 28px;
		}

		.hero h1 {
			margin: 0 0 8px;
			font-size: clamp(2rem, 4vw, 3rem);
		}

		.hero p {
			margin: 0;
			color: rgba(255, 255, 255, 0.8);
			max-width: 72ch;
		}

		.hero__meta {
			margin-top: 16px;
			display: flex;
			flex-wrap: wrap;
			gap: 12px;
			color: rgba(255, 255, 255, 0.74);
			font-size: 0.95rem;
		}

		.summary-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
			gap: 16px;
			margin-bottom: 28px;
		}

		.summary-card, .file-card {
			background: var(--panel);
			border: 1px solid var(--border);
			border-radius: 22px;
			box-shadow: var(--shadow);
		}

		.summary-card {
			padding: 20px;
		}

		.summary-card__label {
			margin: 0 0 8px;
			font-size: 0.85rem;
			text-transform: uppercase;
			letter-spacing: 0.08em;
			color: var(--muted);
		}

		.summary-card__value {
			margin: 0;
			font-size: 2rem;
			font-weight: 700;
		}

		.summary-card__hint {
			margin: 8px 0 0;
			color: var(--muted);
			font-size: 0.95rem;
		}

		.summary-card--danger .summary-card__value {
			color: var(--danger);
		}

		.summary-card--ok .summary-card__value {
			color: var(--ok);
		}

		.file-stack {
			display: grid;
			gap: 18px;
		}

		.file-card {
			padding: 20px;
		}

		.file-card__header {
			display: flex;
			justify-content: space-between;
			gap: 16px;
			align-items: start;
			margin-bottom: 16px;
		}

		.file-card__header h2 {
			margin: 0 0 6px;
			font-size: 1.1rem;
			word-break: break-word;
		}

		.file-card__header p {
			margin: 0;
			color: var(--muted);
		}

		.pill {
			border-radius: 999px;
			padding: 8px 12px;
			font-size: 0.85rem;
			font-weight: 700;
			white-space: nowrap;
		}

		.pill--ok {
			background: var(--ok-soft);
			color: var(--ok);
		}

		.pill--danger {
			background: var(--danger-soft);
			color: var(--danger);
		}

		.test-list {
			display: grid;
			gap: 12px;
		}

		.test-row {
			border: 1px solid var(--border);
			border-radius: 18px;
			padding: 16px;
			background: white;
		}

		.test-row--failed {
			border-color: rgba(159, 18, 57, 0.28);
			background: linear-gradient(180deg, rgba(255, 224, 231, 0.48), #fff);
		}

		.test-row--passed {
			border-color: rgba(18, 106, 67, 0.18);
		}

		.test-row__top {
			display: flex;
			justify-content: space-between;
			gap: 12px;
			align-items: start;
		}

		.test-row__name {
			margin: 0;
			font-weight: 600;
		}

		.test-row__meta {
			margin: 8px 0 0;
			color: var(--muted);
			font-size: 0.92rem;
		}

		details {
			margin-top: 14px;
			border-top: 1px solid var(--border);
			padding-top: 12px;
		}

		summary {
			cursor: pointer;
			font-weight: 600;
			color: var(--danger);
		}

		pre {
			margin: 12px 0 0;
			padding: 14px;
			border-radius: 14px;
			background: #1f2937;
			color: #f8fafc;
			overflow: auto;
			white-space: pre-wrap;
		}

		a {
			color: var(--accent);
			font-weight: 600;
		}

		.empty-state {
			padding: 24px;
			border-radius: 22px;
			border: 1px dashed var(--border);
			background: rgba(255, 253, 248, 0.7);
			color: var(--muted);
		}
	</style>
</head>
<body>
	<main>
		<section class="hero">
			<h1>Test Report</h1>
			<p>Lokale HTML-weergave van de huidige test-run. Handig om failures, testbestanden en foutdetails snel door te lopen zonder door terminaloutput te scrollen.</p>
			<div class="hero__meta">
				<span>Gegenereerd: ${escapeHtml(formatDateTime(report.generatedAtIso))}</span>
				<span>Raw JUnit: <a href="./junit.xml">junit.xml</a></span>
			</div>
		</section>

		<section class="summary-grid">
			${summaryCards.join("")}
		</section>

		<section class="file-stack">
			${fileSections || '<div class="empty-state">Er zijn geen tests gevonden in dit rapport.</div>'}
		</section>
	</main>
</body>
</html>`;
}

function renderTestCase(testCase) {
	const statusLabel =
		testCase.status === "failed" ? "Mislukt" : testCase.status === "skipped" ? "Overgeslagen" : "Geslaagd";
	const durationLabel = `${(testCase.durationSeconds * 1000).toFixed(1)} ms`;

	return `<article class="test-row test-row--${testCase.status}">
		<div class="test-row__top">
			<div>
				<p class="test-row__name">${escapeHtml(testCase.name)}</p>
				<p class="test-row__meta">${escapeHtml(statusLabel)} · ${escapeHtml(durationLabel)}</p>
			</div>
			<span class="pill pill--${testCase.status === "failed" ? "danger" : "ok"}">${escapeHtml(statusLabel)}</span>
		</div>
		${
			testCase.status === "failed"
				? `<details open>
					<summary>${escapeHtml(testCase.errorMessage || "Bekijk foutdetails")}</summary>
					<pre>${escapeHtml(testCase.errorDetails || "Geen extra foutdetails beschikbaar.")}</pre>
				</details>`
				: ""
		}
	</article>`;
}

function createMetricCard(label, value, hint, tone = "neutral") {
	return `<article class="summary-card summary-card--${tone}">
		<p class="summary-card__label">${escapeHtml(label)}</p>
		<p class="summary-card__value">${escapeHtml(value)}</p>
		<p class="summary-card__hint">${escapeHtml(hint)}</p>
	</article>`;
}

function readMetric(xml, metricName) {
	const match = xml.match(new RegExp(`<!--\\s+${metricName}\\s+([^\\s]+)\\s+-->`, "u"));
	return match?.[1] ?? "0";
}

function parseAttributes(value) {
	return Object.fromEntries(
		Array.from(value.matchAll(/([A-Za-z_:][A-Za-z0-9_:.-]*)="([^"]*)"/gmu)).map(match => [match[1], decodeXml(match[2] ?? "")])
	);
}

function groupByFile(testCases) {
	const grouped = new Map();

	for (const testCase of testCases) {
		const currentGroup = grouped.get(testCase.filePath) ?? [];
		currentGroup.push(testCase);
		grouped.set(testCase.filePath, currentGroup);
	}

	return grouped;
}

function normalizeFilePath(filePath) {
	if (!filePath) return "";
	return relative(repositoryRoot, filePath) || filePath;
}

function stripCdata(value) {
	return value.replace(/^<!\[CDATA\[/u, "").replace(/\]\]>$/u, "");
}

function decodeXml(value) {
	return value
		.replace(/&lt;/gu, "<")
		.replace(/&gt;/gu, ">")
		.replace(/&quot;/gu, '"')
		.replace(/&#39;/gu, "'")
		.replace(/&amp;/gu, "&");
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/gu, "&amp;")
		.replace(/</gu, "&lt;")
		.replace(/>/gu, "&gt;")
		.replace(/"/gu, "&quot;")
		.replace(/'/gu, "&#39;");
}

function formatDuration(durationMs) {
	const numericValue = Number(durationMs);
	if (Number.isNaN(numericValue)) return durationMs;
	if (numericValue < 1000) return `${numericValue.toFixed(0)} ms`;
	return `${(numericValue / 1000).toFixed(2)} s`;
}

function formatDateTime(value) {
	return new Intl.DateTimeFormat("nl-NL", {
		dateStyle: "medium",
		timeStyle: "medium",
	}).format(new Date(value));
}
