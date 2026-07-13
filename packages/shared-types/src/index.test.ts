import assert from "node:assert/strict";
import test from "node:test";

import { estimateElearningDurationMinutes, estimateSectionDurationMinutes } from "./index.js";

void test("estimateSectionDurationMinutes enforces a minimum duration", (): void => {
	const duration = estimateSectionDurationMinutes("JUNIOR", {
		title: "Intro",
		content: "",
	});

	assert.equal(duration, 3);
});

void test("estimateSectionDurationMinutes scales with course level and assignment complexity", (): void => {
	const longContent = repeatWord("woord", 700);

	const juniorDuration = estimateSectionDurationMinutes("JUNIOR", {
		title: "Basis",
		content: longContent,
	});
	const seniorDuration = estimateSectionDurationMinutes("SENIOR", {
		title: "Expert",
		content: longContent,
	});
	const quizDuration = estimateSectionDurationMinutes("MEDIOR", {
		title: "Quiz",
		content: repeatWord("tekst", 120),
		assignment: {
			assignmentType: "QUIZ",
			prompt: repeatWord("vraag", 20),
			optionsJson: JSON.stringify(["A", "B", "C"]),
		},
	});
	const openTextDuration = estimateSectionDurationMinutes("MEDIOR", {
		title: "Open vraag",
		content: repeatWord("tekst", 120),
		assignment: {
			assignmentType: "OPEN_TEXT",
			prompt: repeatWord("reflecteer", 20),
		},
	});

	assert.ok(seniorDuration > juniorDuration);
	assert.ok(quizDuration > 3);
	assert.ok(openTextDuration > quizDuration);
});

void test("estimateElearningDurationMinutes combines description and section estimates", (): void => {
	const duration = estimateElearningDurationMinutes({
		description: repeatWord("samenvatting", 220),
		level: "JUNIOR",
		sections: [
			{ title: "Onderdeel 1", content: repeatWord("tekst", 700) },
			{ title: "Onderdeel 2", content: repeatWord("tekst", 700) },
		],
	});

	assert.equal(duration, 9);
});

function repeatWord(word: string, count: number): string {
	return Array.from({ length: count }, () => word).join(" ");
}
