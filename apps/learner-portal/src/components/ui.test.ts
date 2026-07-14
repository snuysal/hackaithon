import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CourseCard, PasswordInput } from "./ui.js";

void test("should be able to render the estimated duration from the API model in the course card", (): void => {
	const markup = renderToStaticMarkup(
		createElement(CourseCard, {
			course: {
				id: "course-1",
				title: "Security Basics",
				description: "Leer de basis van veilig ontwikkelen.",
				level: "MEDIOR",
				audience: "PARTICIPANT",
				status: "PUBLISHED",
				sectionCount: 4,
				estimatedDurationMinutes: 37,
				publishedAtIso: "2026-07-10T10:00:00.000Z",
			},
			onOpen: () => undefined,
		})
	);

	assert.match(markup, /37 min/);
	assert.match(markup, /Security Basics/);
	assert.match(markup, /4 onderdelen/);
});

void test("should render password inputs hidden by default with an accessible visibility toggle", (): void => {
	const markup = renderToStaticMarkup(createElement(PasswordInput, { id: "password", value: "secret1", readOnly: true }));

	assert.match(markup, /type="password"/);
	assert.match(markup, /aria-label="Wachtwoord tonen"/);
});
