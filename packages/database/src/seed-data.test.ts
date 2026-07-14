import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_SEED_ELEARNINGS } from "./seed-data.js";

void test("should be able to provide onboarding e-learnings for all audiences", (): void => {
    assert.equal(DEFAULT_SEED_ELEARNINGS.length, 3);
    assert.deepEqual(
        DEFAULT_SEED_ELEARNINGS.map(elearning => elearning.audience).sort(),
        ["ALL", "PARTICIPANT", "STAFF"]
    );
    assert.ok(DEFAULT_SEED_ELEARNINGS.every(elearning => elearning.sections.length >= 3));
});

void test("should be able to keep all onboarding seed identifiers unique for idempotent updates", (): void => {
    const courseIds = DEFAULT_SEED_ELEARNINGS.map(elearning => elearning.id);
    const sectionIds = DEFAULT_SEED_ELEARNINGS.flatMap(elearning => elearning.sections.map(section => section.id));

    assert.equal(new Set(courseIds).size, courseIds.length);
    assert.equal(new Set(sectionIds).size, sectionIds.length);
});

void test("should be able to include reviewable open questions in every onboarding e-learning", (): void => {
    assert.ok(
        DEFAULT_SEED_ELEARNINGS.every(elearning =>
            elearning.sections.some(section => section.assignment?.assignmentType === "OPEN_TEXT")
        )
    );
});

void test("should be able to add a public Cerios onboarding e-learning for all users", (): void => {
    const ceriosOnboarding = DEFAULT_SEED_ELEARNINGS.find(elearning => elearning.id === "seed-elearning-cerios-onboarding");

    assert.ok(ceriosOnboarding);
    assert.equal(ceriosOnboarding?.audience, "ALL");
    assert.equal(ceriosOnboarding?.title, "Welkom bij Cerios B.V.");
    assert.ok(ceriosOnboarding?.sections.length >= 10);
    assert.equal(ceriosOnboarding?.sections.filter(section => section.assignment?.assignmentType === "OPEN_TEXT").length, 2);
    assert.ok(ceriosOnboarding?.description.includes("Cerios.nl"));
});

void test("should be able to assign the participant onboarding to the default trainer for review", (): void => {
    const participantOnboarding = DEFAULT_SEED_ELEARNINGS.find(
        elearning => elearning.id === "seed-elearning-participant-introduction"
    );

    assert.equal(participantOnboarding?.createdByEmail, "trainer@hackaithon.local");
    assert.ok(participantOnboarding?.sections.some(section => section.content.includes("Wacht op nakijken")));
});
