import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_SEED_ELEARNINGS } from "./seed-data.js";

void test("should be able to provide separate onboarding e-learnings for staff and participants", (): void => {
    assert.equal(DEFAULT_SEED_ELEARNINGS.length, 2);
    assert.deepEqual(
        DEFAULT_SEED_ELEARNINGS.map(elearning => elearning.audience).sort(),
        ["PARTICIPANT", "STAFF"]
    );
    assert.ok(DEFAULT_SEED_ELEARNINGS.every(elearning => elearning.sections.length >= 3));
});

void test("should be able to keep all onboarding seed identifiers unique for idempotent updates", (): void => {
    const courseIds = DEFAULT_SEED_ELEARNINGS.map(elearning => elearning.id);
    const sectionIds = DEFAULT_SEED_ELEARNINGS.flatMap(elearning => elearning.sections.map(section => section.id));

    assert.equal(new Set(courseIds).size, courseIds.length);
    assert.equal(new Set(sectionIds).size, sectionIds.length);
});
